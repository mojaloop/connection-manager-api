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

jest.mock('../../src/mertics-server', () => ({ createMetricsServer: jest.fn() }));
jest.mock('../../src/dfsp-watcher', () => ({ createDfspWatcher: jest.fn() }));
jest.mock('../../src/lifecycle', () => ({ ...jest.requireActual('../../src/lifecycle'), serve: jest.fn() }));

const { createMetricsServer } = require('../../src/mertics-server');
const { createDfspWatcher } = require('../../src/dfsp-watcher');
const { serve } = require('../../src/lifecycle');

const SIGTERM = 'SIGTERM';

describe('connection-manager-api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops the DFSP watcher, the metrics server and the API server, then closes what connect opened', async () => {
    const close = jest.fn();
    const connect = jest.fn().mockResolvedValue({ app: jest.fn(), close });
    const closeServer = jest.fn();
    serve.mockResolvedValue(closeServer);
    const metricsServer = { start: jest.fn(), stop: jest.fn() };
    createMetricsServer.mockReturnValue(metricsServer);
    const watcher = { start: jest.fn(), stopWatching: jest.fn() };
    createDfspWatcher.mockReturnValue(watcher);
    const once = jest.spyOn(process, 'once').mockImplementation(() => process);
    const run = require('../../src/index');

    await expect(run({
      connect,
      constants: { dfspWatcherEnabled: true },
      http: { createServer: jest.fn() },
    })).resolves.toBe(true);
    const handlers = Object.fromEntries(once.mock.calls);
    await handlers[SIGTERM]();

    const stops = [watcher.stopWatching, metricsServer.stop, closeServer, close];
    stops.forEach((stop) => expect(stop).toHaveBeenCalledTimes(1));
    const order = stops.map((stop) => stop.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
