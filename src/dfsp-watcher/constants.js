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

const CONTEXT = 'MCM';

const PingStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  NOT_REACHABLE: 'NOT_REACHABLE',
  JWS_FAILED: 'JWS_FAILED',
  TIMED_OUT: 'TIMED_OUT',
  PING_ERROR: 'PING_ERROR', // connection to ping-pong server failed
});

const PingStatusNumber = Object.freeze({
  [PingStatus.SUCCESS]: 0,
  [PingStatus.NOT_REACHABLE]: 1,
  [PingStatus.JWS_FAILED]: 2,
  [PingStatus.TIMED_OUT]: 3,
  [PingStatus.PING_ERROR]: 4,
});

const PingStatusToError = Object.freeze({
  [PingStatus.NOT_REACHABLE]: 'network',
  [PingStatus.JWS_FAILED]: 'jws',
  [PingStatus.TIMED_OUT]: 'timeout',
  [PingStatus.PING_ERROR]: 'ping_error',
  // todo: think, how to detect mTLS error
});

const PingStep = Object.freeze({
  SEND: 'SEND', // no request sent to PingPong server (e.g., network issue)
  RECEIVE: 'RECEIVE', // response received from PingPong server
});

const DEFAULT_HTTP_TIMEOUT_MS = 40_000; // todo: make configurable

module.exports = {
  CONTEXT,
  PingStatus,
  PingStatusNumber,
  PingStatusToError,
  PingStep,
  DEFAULT_HTTP_TIMEOUT_MS,
};
