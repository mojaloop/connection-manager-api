/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation

 --------------
 ******/

'use strict';

const http = require('node:http');
const { createLifecycle, serve, SHUTDOWN_SIGNALS, EXIT_CODE } = require('../../src/lifecycle');

const SIGTERM = 'SIGTERM';
const SIGINT = 'SIGINT';
const ANY_PORT = 0;
const SLOW_PATH = '/slow';
const KEEP_ALIVE = 'keep-alive';
const CONNECTION_CLOSE = 'close';

const logger = { info: jest.fn(), error: jest.fn() };

const withSignals = () => {
  const once = jest.spyOn(process, 'once').mockImplementation(() => process);
  const lifecycle = createLifecycle();
  const handlers = Object.fromEntries(once.mock.calls);
  once.mockRestore();
  return { lifecycle, handlers };
};

const startWithSignals = (steps) => {
  const { lifecycle, handlers } = withSignals();
  return { startup: lifecycle.start({ logger, steps }), handlers };
};

const stepStopping = (stop) => jest.fn(async () => stop);

const callOrder = (fns) => fns.map((fn) => fn.mock.invocationCallOrder[0]);

describe('lifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('listens for SIGTERM and SIGINT from the moment it is created', () => {
    const { handlers } = withSignals();

    expect(Object.keys(handlers)).toEqual([SIGTERM, SIGINT]);
    expect(SHUTDOWN_SIGNALS).toEqual([SIGTERM, SIGINT]);
  });

  it('a signal before startup begins is held until it does, and then nothing starts', async () => {
    const { lifecycle, handlers } = withSignals();
    const step = jest.fn();

    const stopped = handlers[SIGTERM]();
    const startup = lifecycle.start({ logger, steps: [step] });

    await expect(startup).resolves.toBe(false);
    await stopped;
    expect(step).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(`Shutting down on ${SIGTERM}`);
  });

  it('runs the steps in order and stops them in reverse on a signal', async () => {
    const stops = [jest.fn(), jest.fn(), jest.fn()];
    const steps = stops.map(stepStopping);
    const { startup, handlers } = startWithSignals(steps);

    await expect(startup).resolves.toBe(true);
    expect(callOrder(steps)).toEqual([...callOrder(steps)].sort((a, b) => a - b));
    stops.forEach((stop) => expect(stop).not.toHaveBeenCalled());

    await handlers[SIGTERM]();

    const order = callOrder(stops);
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it('a signal during startup lets the running step finish, starts nothing after it, then stops what started', async () => {
    const stopFirst = jest.fn();
    const stopRunning = jest.fn();
    let finishRunning;
    const running = jest.fn(() => new Promise((resolve) => { finishRunning = () => resolve(stopRunning); }));
    const next = jest.fn();
    const { startup, handlers } = startWithSignals([stepStopping(stopFirst), running, next]);

    while (finishRunning === undefined) await new Promise((resolve) => setImmediate(resolve));
    const stopped = handlers[SIGINT]();
    expect(stopRunning).not.toHaveBeenCalled();
    expect(stopFirst).not.toHaveBeenCalled();

    finishRunning();
    await expect(startup).resolves.toBe(false);
    await stopped;

    expect(next).not.toHaveBeenCalled();
    expect(stopRunning.mock.invocationCallOrder[0]).toBeLessThan(stopFirst.mock.invocationCallOrder[0]);
  });

  it('a failed stop exits with a failure code', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const { startup, handlers } = startWithSignals([stepStopping(jest.fn().mockRejectedValue(new Error('stuck')))]);
    await startup;

    await handlers[SIGTERM]();

    expect(exit).toHaveBeenCalledWith(EXIT_CODE.FAILURE);
  });

  it('a shutdown that stops everything leaves the exit to node', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const { startup, handlers } = startWithSignals([stepStopping(jest.fn())]);
    await startup;

    await handlers[SIGTERM]();

    expect(exit).not.toHaveBeenCalled();
  });
});

describe('serve', () => {
  const get = (port, path, agent) => new Promise((resolve, reject) => {
    http.get({ port, path, agent }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ body, connection: res.headers.connection }));
    }).on('error', reject);
  });

  it('answers the request in flight, closes its keep-alive connection, and only then reports the server closed', async () => {
    let answerSlow;
    const server = http.createServer((req, res) => {
      if (req.url === SLOW_PATH) answerSlow = () => res.end(SLOW_PATH);
      else res.end();
    });
    server.keepAliveTimeout = 0;
    const close = await serve(server, ANY_PORT);
    const { port } = server.address();
    const idle = new http.Agent({ keepAlive: true });
    const busy = new http.Agent({ keepAlive: true });

    expect((await get(port, '/', idle)).connection).toBe(KEEP_ALIVE);
    const slow = get(port, SLOW_PATH, busy);
    while (answerSlow === undefined) await new Promise((resolve) => setImmediate(resolve));

    let closed = false;
    const closing = close().then(() => { closed = true; });
    await new Promise((resolve) => setImmediate(resolve));
    expect(closed).toBe(false);

    answerSlow();
    expect(await slow).toEqual({ body: SLOW_PATH, connection: CONNECTION_CLOSE });
    await closing;
    expect(server.listening).toBe(false);
  });

  it('closes a keep-alive connection whose response had started when the server was closed, once that response ends', async () => {
    let finishStream;
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.write(SLOW_PATH);
      finishStream = () => res.end();
    });
    server.keepAliveTimeout = 0;
    const close = await serve(server, ANY_PORT);
    const streamed = get(server.address().port, SLOW_PATH, new http.Agent({ keepAlive: true }));
    while (finishStream === undefined) await new Promise((resolve) => setImmediate(resolve));

    const closing = close();
    finishStream();

    expect(await streamed).toEqual({ body: SLOW_PATH, connection: KEEP_ALIVE });
    await closing;
    expect(server.listening).toBe(false);
  });

  it('rejects when the port cannot be listened on', async () => {
    const taken = http.createServer();
    await serve(taken, ANY_PORT);

    await expect(serve(http.createServer(), taken.address().port)).rejects.toThrow();

    taken.close();
  });
});
