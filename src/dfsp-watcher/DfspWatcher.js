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
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { ulid } = require('ulid');
const { CONTEXT } = require('../constants/Constants');
const { PingStatus, PingStatusNumber, PingStatusToError, PingStep } = require('./constants');

/**
 * @typedef {Object} DfspWatcherDeps
 * @prop {Object} config - Configuration for DfspWatcher.
 * @prop {ContextLogger} logger - ContextLogger instance.
 * @prop {DFSPModel} dfspModel - Model to interact with DB (dfsps table).
 * @prop {PingPongClient} pingPongClient - Send http request to PingPong server.
 * @prop {Metrics} metrics - Wrapper for prom-client from @mojaloop/central-services-metrics.
 */

class DfspWatcher {
  #timer = null;

  /** @param {DfspWatcherDeps} deps */
  constructor(deps) {
    this.log = deps.logger.child({ component: this.constructor.name });
    this.config = deps.config;
    this.dfspModel = deps.dfspModel;
    this.pingPongClient = deps.pingPongClient;
    this.metrics = deps.metrics;

    this.dfspStatusGauge = this.metrics.getGauge(
      'dfsp_status_state',
      'DFSP status indicator (enum value of current status)',
      ['dfsp']
    );

    this.dfspPingLatencyHistogram = this.metrics.getHistogram(
      'dfsp_ping_latency_seconds',
      'DFSP ping latency in seconds',
      ['dfsp', 'success']
    );
  }

  async start() {
    await this.startWatching();
    this.log.info(`DfspWatcher is started`);
  }

  async startWatching() {
    await this.pingWatchedDfsps();
    const interval = this.config.get('pingInterval');
    this.#timer = setTimeout(() => this.startWatching(), interval * 1000);
    this.log.verbose(`next pingWatchedDfsps is scheduled in ${interval} seconds...`);
  }

  async stopWatching() {
    clearTimeout(this.#timer);
    this.#timer = null;
    this.log.info(`stopWatching is done`);
  }

  async pingWatchedDfsps() {
    try {
      const dfspIds = await this.#getWatchedDfspIds();
      const results = await Promise.all(dfspIds.map(id => this.processOneDfspPing(id)));
      this.log.info(`pingWatchedDfsps is done:`, { results });
    } catch (err) {
      this.log.error(`error in pingWatchedDfsps: `, err);
    }
  }

  async processOneDfspPing(dfspId) {
    const requestId = this.#generateRequestId();
    const histTimerEnd = this.dfspPingLatencyHistogram.startTimer({ dfsp: dfspId });
    const { pingStatus, errorInformation } = await this.pingPongClient.sendPingRequest(dfspId, requestId);
    const success = !errorInformation;
    histTimerEnd({ success });
    const isUpdated = await this.dfspModel.updatePingStatus(dfspId, pingStatus);

    // Set Prometheus gauge for DFSP status using enum number
    this.#setDfspStatusGauge(dfspId, pingStatus);

    if (pingStatus !== PingStatus.SUCCESS) this.#incrementErrorCounter(dfspId, pingStatus);
    this.log.verbose(`processOneDfspPing is done:`, { dfspId, isUpdated, requestId, pingStatus, errorInformation });
    return { pingStatus, dfspId };
  }

  async #getWatchedDfspIds() {
    return this.dfspModel.findWatchedDfspIds()
      .catch(err => {
        this.log.warn(`error in #getWatchedDfspIds: `, err);
        return [];
      });
  }

  #incrementErrorCounter(dfspId, pingStatus) {
    const step = pingStatus !== PingStatus.PING_ERROR
      ? PingStep.RECEIVE
      : PingStep.SEND;
    const log = this.log.child({ dfspId, step });

    try {
      const errorCounter = this.metrics.getCounter('errorCount');
      const errDetails = {
        system: dfspId,
        code: PingStatusToError[pingStatus] || 'unknown',
        context: CONTEXT,
        operation: `ping-${dfspId}`,
      };
      errorCounter.inc(errDetails);
      log.info('incrementErrorCounter is called:', { errDetails });
    } catch (error) {
      log.error('error in incrementErrorCounter: ', error);
    }
  }

  #generateRequestId() {
    const requestId = ulid();
    this.log.debug(`generated requestId:`, { requestId });
    return requestId;
  }

  #setDfspStatusGauge(dfspId, newPingStatus) {
    try {
      const statusValue = PingStatusNumber[newPingStatus];
      if (typeof statusValue === 'undefined') {
        this.log.warn('Invalid pingStatus for dfspStatusGauge, setting to -1 as fallback.', { dfspId, newPingStatus });
        this.dfspStatusGauge.set({ dfsp: dfspId }, -1);
      } else {
        this.dfspStatusGauge.set({ dfsp: dfspId }, statusValue);
      }
    } catch (error) {
      this.log.error('Error setting dfspStatusGauge:', { dfspId, newPingStatus, error });
    }
  }
}

module.exports = DfspWatcher;
