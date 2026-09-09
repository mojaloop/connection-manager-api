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

const Constants = require('../constants/Constants');

/**
 * Talks to the IAM about the resources this service creates. It records that
 * a DFSP exists and moves role assignments; the resource name DFSPs are filed
 * under and the role names both arrive as deployment configuration, passed
 * through opaquely. Nothing here knows a role name or a permission.
 */

const call = async (path, method, body) => {
  const response = await fetch(`${Constants.IAM.PROVISIONING_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`IAM answered ${response.status}: ${(await response.text()).trim()}`);
  }
  return response.json();
};

/**
 * @param {string} dfspId
 */
exports.provisionDfsp = async (dfspId) =>
  call('/provision', 'POST', { resourceName: Constants.IAM.DFSP_RESOURCE_NAME, id: dfspId });

/**
 * Adds a subject to a role over one DFSP.
 *
 * @param {string} subjectId
 * @param {string} role
 * @param {string} dfspId
 */
exports.assignDfspRole = async (subjectId, role, dfspId) =>
  call(`/subjects/${encodeURIComponent(subjectId)}/assignments`, 'POST', {
    role,
    resources: { [Constants.IAM.DFSP_RESOURCE_NAME]: dfspId },
  });

/**
 * Retires the DFSP's roles and answers with the subjects left holding none, so
 * the caller can retire an identity that operates nothing else.
 *
 * @param {string} dfspId
 * @returns {Promise<{orphaned: string[]}>}
 */
exports.deprovisionDfsp = async (dfspId) =>
  call('/provision', 'DELETE', { resourceName: Constants.IAM.DFSP_RESOURCE_NAME, id: dfspId });
