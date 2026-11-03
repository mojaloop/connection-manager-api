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
const Iam = require('./IamClient');
const InternalError = require('../errors/InternalError');
const NotImplementedError = require('../errors/NotImplementedError');
const formatValidator = require('../utils/formatValidator');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'DfspIamService' });

/**
 * DFSP onboarding through the IAM. A new DFSP is recorded with the IAM as a
 * resource, and the principals that operate it are created there: a machine
 * client whose id is the DFSP id, and the DFSP admin's account, which the IAM
 * invites by email. Each is assigned the role the deployment configured over
 * the DFSP, the names passed through opaquely; a hub operator can reshape the
 * result afterwards like any other role.
 *
 * With the IAM disabled none of this happens: the deployment brings its own
 * identity and permission system, and this service creates nothing in it.
 */

const over = (dfspId) => ({ [Constants.IAM.DFSP_RESOURCE_NAME]: dfspId });

/**
 * The DFSP's machine client with a secret nobody else holds: an existing
 * client's secret is replaced, an absent one is created. A client created
 * by a concurrent request between the two calls has its secret replaced.
 *
 * @returns {Promise<{client: {subject: string, secret: string}, created: boolean}>}
 */
const freshClient = async (dfspId) => {
  const rotated = await Iam.rotateClientSecret(dfspId);
  if (rotated) return { client: rotated, created: false };

  const created = await Iam.createClient({
    id: dfspId,
    name: `PM4ML client for DFSP ${dfspId}`,
    audience: [Constants.IAM.DFSP_CLIENT_AUDIENCE],
  });
  if (created) return { client: created, created: true };

  const raced = await Iam.rotateClientSecret(dfspId);
  if (raced) return { client: raced, created: false };
  throw new InternalError(`The IAM reports a client ${dfspId} both present and absent`);
};

/**
 * Checks what onboarding needs of the request, so a caller can refuse it
 * before anything is written anywhere: the admin's email, when accounts are
 * created automatically. No-op when IAM is disabled.
 *
 * @param {string} email
 */
exports.validateOnboarding = (email) => {
  if (Constants.IAM.ENABLED && Constants.IAM.AUTO_CREATE_ACCOUNTS) formatValidator.validateEmail(email);
};

/**
 * Records a new DFSP with the IAM and, when accounts are created
 * automatically, creates and assigns its principals. What was done is undone,
 * in reverse, when a step fails. No-op when IAM is disabled.
 *
 * @param {string} dfspId
 * @param {string} email  the DFSP admin's email; receives the invitation
 */
exports.provisionDfsp = async (dfspId, email) => {
  if (!Constants.IAM.ENABLED) return;
  formatValidator.validateDfspId(dfspId);
  exports.validateOnboarding(email);

  const undo = [];
  const assign = async (subject, role) => {
    if (!role) return;
    await Iam.assign(subject, role, over(dfspId));
    undo.push(() => Iam.unassign(subject, role, over(dfspId)));
  };

  try {
    await Iam.provision(Constants.IAM.DFSP_RESOURCE_NAME, dfspId);
    undo.push(() => Iam.deprovision(Constants.IAM.DFSP_RESOURCE_NAME, dfspId));

    if (Constants.IAM.AUTO_CREATE_ACCOUNTS) {
      const { client, created } = await freshClient(dfspId);
      if (created) undo.push(() => Iam.deleteClient(client.subject));
      await assign(client.subject, Constants.IAM.DFSP_CLIENT_ROLE);

      // Last of the principals: creating the account sends the invitation
      const account = await Iam.createAccount(email);
      if (account.created) undo.push(() => Iam.deleteAccount(account.subject));
      await assign(account.subject, Constants.IAM.DFSP_ADMIN_ROLE);
      log.info(`Provisioned DFSP ${dfspId}`, { admin: account.subject, invited: account.invited });
    } else {
      log.info(`Provisioned DFSP ${dfspId}`);
    }
  } catch (err) {
    log.error(`Provisioning failed for DFSP ${dfspId}, rolling back`, { message: err.message });
    for (const step of undo.reverse()) {
      await step().catch((e) => log.warn(`IAM rollback step failed for DFSP ${dfspId}`, { message: e.message }));
    }
    throw err;
  }
};

/**
 * Tears a DFSP down: the IAM drops the DFSP and every role over it, the
 * DFSP's machine client is retired, and so is every person left holding no
 * role. A person still holding a role elsewhere is kept, which is how a
 * system integrator survives losing one of its DFSPs. No-op when IAM is
 * disabled.
 *
 * @param {string} dfspId
 */
exports.deprovisionDfsp = async (dfspId) => {
  if (!Constants.IAM.ENABLED) return;

  const orphaned = await Iam.deprovision(Constants.IAM.DFSP_RESOURCE_NAME, dfspId);
  const retire = (operation, subject) => operation(subject).catch((e) =>
    log.warn(`Could not retire ${subject} of DFSP ${dfspId}`, { message: e.message }));

  await retire(Iam.deleteClient, dfspId);
  const people = orphaned.filter((subject) => subject !== dfspId);
  for (const subject of people) await retire(Iam.deleteAccount, subject);
  log.info(`Deprovisioned DFSP ${dfspId}`, { orphanedPeople: people.length });
};

/**
 * Returns fresh PM4ML credentials for the DFSP: rotates the machine client's
 * secret, creating the client when absent. A client created here is left as
 * onboarding leaves one: the DFSP recorded with the IAM and the client holding
 * its role over it; a client that cannot be given its role is removed again.
 * Machine clients exist only in the IAM, so with it disabled the feature is
 * unavailable.
 *
 * @param {string} dfspId
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
exports.rotateDfspClientCredentials = async (dfspId) => {
  if (!Constants.IAM.ENABLED) {
    throw new NotImplementedError('DFSP API credentials are issued by the IAM, which this deployment does not run');
  }
  const { client, created } = await freshClient(dfspId);
  if (created && Constants.IAM.DFSP_CLIENT_ROLE) {
    try {
      await Iam.provision(Constants.IAM.DFSP_RESOURCE_NAME, dfspId);
      await Iam.assign(client.subject, Constants.IAM.DFSP_CLIENT_ROLE, over(dfspId));
    } catch (err) {
      log.error(`Could not give the new client of DFSP ${dfspId} its role, removing it`, { message: err.message });
      await Iam.deleteClient(client.subject).catch((e) =>
        log.warn(`Could not remove the new client of DFSP ${dfspId}`, { message: e.message }));
      throw err;
    }
  }
  return { clientId: client.subject, clientSecret: client.secret };
};
