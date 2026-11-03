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

const SHUTDOWN_SIGNALS = Object.freeze(['SIGTERM', 'SIGINT']);
const EXIT_CODE = Object.freeze({ FAILURE: 1 });

/**
 * Starts the service one step at a time and stops it on SIGTERM or SIGINT.
 * A step resolves to the function that stops what it started, and the
 * started steps stop in reverse order. A signal during startup lets the
 * running step finish and starts nothing after it.
 *
 * The signals are taken from the moment this is called. Until then node
 * dies of them, so the entry module calls it before it loads anything else.
 */
const createLifecycle = () => {
  const stops = [];
  let stopping = false;
  let begin;
  const begun = new Promise((resolve) => { begin = resolve; });

  const runSteps = async (steps) => {
    for (const step of steps) {
      if (stopping) return false;
      const stop = await step();
      if (stop) stops.push(stop);
    }
    return true;
  };

  const stop = async (logger) => {
    while (stops.length > 0) {
      await stops.pop()();
    }
    logger.info('Shutdown complete');
  };

  const onSignal = async (signal) => {
    stopping = true;
    const { logger, startup } = await begun;
    logger.info(`Shutting down on ${signal}`);
    try {
      await startup;
      await stop(logger);
    } catch (err) {
      logger.error('Shutdown failed', err);
      process.exit(EXIT_CODE.FAILURE);
    }
  };

  SHUTDOWN_SIGNALS.forEach((signal) => process.once(signal, () => onSignal(signal)));

  const start = ({ logger, steps }) => {
    const startup = runSteps(steps);
    begin({ logger, startup });
    return startup;
  };

  return { start };
};

/**
 * Listens, and resolves to the function that stops the server once every
 * request it took has been answered. node's server.close() closes only the
 * connections idle at the moment it is called, so from then on each
 * keep-alive connection closes as soon as its response is done, and a
 * response not yet started tells its client so.
 */
const serve = (server, port) => new Promise((resolve, reject) => {
  const responses = new Set();
  let closing = false;

  server.on('request', (req, res) => {
    responses.add(res);
    if (closing) res.shouldKeepAlive = false;
    res.on('close', () => {
      responses.delete(res);
      if (closing) server.closeIdleConnections();
    });
  });

  const close = () => new Promise((resolveClose, rejectClose) => {
    closing = true;
    responses.forEach((res) => {
      if (!res.headersSent) res.shouldKeepAlive = false;
    });
    server.close((err) => (err ? rejectClose(err) : resolveClose()));
  });

  server.once('error', reject);
  server.listen(port, () => {
    server.off('error', reject);
    resolve(close);
  });
});

module.exports = {
  SHUTDOWN_SIGNALS,
  EXIT_CODE,
  createLifecycle,
  serve
};
