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
const HydraService = require('./HydraService');
const KratosService = require('./KratosService');
const IamProvisioning = require('./IamProvisioningClient');
const formatValidator = require('../utils/formatValidator');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'DfspIamService' });

/**
 * DFSP onboarding. This service creates what a new DFSP needs to be operated:
 * a machine OAuth2 client in Hydra, an admin identity in Kratos, and the
 * invitation that lets that admin set a password.
 *
 * It then records the DFSP with the IAM and assigns each principal the role
 * the deployment configured, passing the names through opaquely. A hub
 * operator can reshape the result afterwards like any other role.
 */

const assignConfigured = async (subjectId, role, dfspId) => {
  if (!role) return;
  await IamProvisioning.assignDfspRole(subjectId, role, dfspId);
};

/**
 * Provisions all IAM resources for a new DFSP. Rolls everything back on
 * failure. No-op when IAM is disabled.
 *
 * @param {string} dfspId
 * @param {string} email  the DFSP admin's email; receives the invitation
 */
exports.provisionDfsp = async (dfspId, email) => {
  if (!Constants.IAM.ENABLED || !Constants.IAM.AUTO_CREATE_ACCOUNTS) return;

  formatValidator.validateDfspId(dfspId);
  formatValidator.validateEmail(email);

  let clientCreated = false;
  let identityId = null;

  try {
    const { clientId } = await HydraService.createPM4MLClient(dfspId);
    clientCreated = true;

    ({ identityId } = await KratosService.createIdentity(email, dfspId));

    await IamProvisioning.provisionDfsp(dfspId);
    await assignConfigured(identityId, Constants.IAM.DFSP_ADMIN_ROLE, dfspId);
    await assignConfigured(clientId ?? dfspId, Constants.IAM.DFSP_CLIENT_ROLE, dfspId);

    await KratosService.sendInvitationEmail(email);
    log.info(`Provisioned DFSP ${dfspId}`, { identityId });
  } catch (err) {
    log.error(`Provisioning failed for DFSP ${dfspId}, rolling back`, { message: err.message });
    await IamProvisioning.deprovisionDfsp(dfspId).catch((e) => log.warn('IAM rollback failed', { e: e.message }));
    if (identityId) {
      await KratosService.deleteIdentity(identityId).catch((e) => log.warn('Kratos rollback failed', { e: e.message }));
    }
    if (clientCreated) {
      await HydraService.deleteClient(dfspId).catch((e) => log.warn('Hydra rollback failed', { e: e.message }));
    }
    throw err;
  }
};

/**
 * Tears a DFSP down: its roles, its machine client, and the identities that
 * operated it. An identity is kept when it still holds a role somewhere,
 * which is how a system integrator survives losing one of its DFSPs. No-op
 * when IAM is disabled.
 *
 * @param {string} dfspId
 */
exports.deprovisionDfsp = async (dfspId) => {
  if (!Constants.IAM.ENABLED) return;

  const { orphaned } = await IamProvisioning.deprovisionDfsp(dfspId);
  for (const subjectId of orphaned) {
    await KratosService.deleteIdentity(subjectId).catch((e) =>
      log.warn(`Could not delete identity ${subjectId}`, { e: e.message }));
  }
  await HydraService.deleteClient(dfspId);
  log.info(`Deprovisioned DFSP ${dfspId}`, { identitiesRemoved: orphaned.length });
};

/**
 * Returns fresh PM4ML credentials for the DFSP: rotates the machine client's
 * secret, creating the client when absent.
 *
 * @param {string} dfspId
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
exports.rotateDfspClientCredentials = async (dfspId) => {
  const existing = await HydraService.getClient(dfspId);
  return existing
    ? HydraService.rotateClientSecret(dfspId)
    : HydraService.createPM4MLClient(dfspId);
};
