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

const DFSP_STATES = [
  'PEER_JWS',
  'DFSP_JWS',
  'DFSP_CA',
  'DFSP_SERVER_CERT',
  'DFSP_CLIENT_CERT',
  'HUB_CA',
  'HUB_CERT',
  'HUB_CLIENT_CERT',
  'ENDPOINT_CONFIG',
  'UPLOAD_PEER_JWS'
];

// TODO: find and link document containing rules on allowable paths
const vaultPaths = {
  HUB_SERVER_CERT: 'hub-server-cert',
  DFSP_SERVER_CERT: 'dfsp-server-cert',
  JWS_CERTS: 'dfsp-jws-certs',
  EXTERNAL_JWS_CERTS: 'dfsp-external-jws-certs',
  HUB_ENDPOINTS: 'hub-endpoints',
  DFSP_CA: 'dfsp-ca',
  HUB_CA_DETAILS: 'hub-ca-details',
  DFSP_OUTBOUND_ENROLLMENT: 'dfsp-outbound-enrollment',
  DFSP_INBOUND_ENROLLMENT: 'dfsp-inbound-enrollment',
};

module.exports = {
  CONTEXT,
  DFSP_STATES,
  vaultPaths
};
