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
const InternalError = require('../errors/InternalError');
const formatValidator = require('../utils/formatValidator');
const requireEsm = require('../utils/requireEsm');
const KetoClient = require('../utils/KetoClient');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'KeycloakService' });

const getKeycloakAdminClient = async () => {
  try {
    const { default: KcAdminClient } = await requireEsm('@keycloak/keycloak-admin-client');
    const kcAdminClient = new KcAdminClient({
      baseUrl: Constants.KEYCLOAK.BASE_URL,
      realmName: Constants.KEYCLOAK.DFSPS_REALM,
    });

    await kcAdminClient.auth({
      clientId: Constants.KEYCLOAK.ADMIN_CLIENT_ID,
      clientSecret: Constants.KEYCLOAK.ADMIN_CLIENT_SECRET,
      grantType: 'client_credentials',
    });

    return kcAdminClient;
  } catch (error) {
    log.error('Error creating Keycloak admin client:', error);
    throw new InternalError('Failed to connect to Keycloak server');
  }
};

let ketoClientCache = null;
const getKetoClient = () => {
  if (!ketoClientCache) {
    ketoClientCache = new KetoClient(Constants.KETO.WRITE_URL);
  }
  return ketoClientCache;
};


const getDfspGroupName = (dfspId) => `${Constants.OPENID.GROUPS.DFSP}:${dfspId}`;


const findApplicationGroup = async (kcAdminClient) => {
  const groups = await kcAdminClient.groups.find({ max: -1 });
  const applicationGroup = groups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);

  if (!applicationGroup?.id) {
    throw new Error(`${Constants.OPENID.GROUPS.APPLICATION} group not found`);
  }

  return applicationGroup;
};


const createDfspGroup = async (kcAdminClient, dfspId) => {
  const applicationGroup = await findApplicationGroup(kcAdminClient);
  const dfspGroupName = getDfspGroupName(dfspId);

  const subGroups = await kcAdminClient.groups.listSubGroups({
    parentId: applicationGroup.id,
    max: -1
  });
  let dfspGroup = subGroups.find(g => g.name === dfspGroupName);

  if (!dfspGroup) {
    dfspGroup = await kcAdminClient.groups.createChildGroup({id: applicationGroup.id}, {
      name: dfspGroupName,
    });
    dfspGroup.preExisting = false;
    log.info(`Created DFSP group ${dfspGroupName}`);
  } else {
    dfspGroup.preExisting = true;
  }

  return dfspGroup;
};

const createClientConfig = (dfspId) => {
  return {
    clientId: dfspId,
    name: `API Client for ${dfspId}`,
    description: `OAuth client for DFSP ${dfspId} API integration`,
    enabled: true,
    clientAuthenticatorType: 'client-secret',
    directAccessGrantsEnabled: false,
    redirectUris: ['*'],
    webOrigins: [],
    standardFlowEnabled: false,
    implicitFlowEnabled: false,
    serviceAccountsEnabled: true,
    publicClient: false,
    protocol: 'openid-connect',
    attributes: {
      'dfsp.id': dfspId,
      'purpose': 'api-integration'
    },
    protocolMappers: [
      {
        name: 'audience-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-audience-mapper',
        config: {
          'included.custom.audience': 'connection-manager-api',
          'id.token.claim': 'false',
          'access.token.claim': 'true'
        }
      },
      {
        name: 'groups-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-group-membership-mapper',
        config: {
          'claim.name': 'groups',
          'full.path': 'true',
          'id.token.claim': 'false',
          'access.token.claim': 'true',
          'userinfo.token.claim': 'false'
        }
      }
    ]
  };
};


const createUserConfig = (email) => {
  const userConfig = {
    username: email,
    email,
    enabled: true,
    emailVerified: true,
    requiredActions: ['UPDATE_PASSWORD', 'UPDATE_PROFILE'],
  };

  if (Constants.OPENID.ENABLE_2FA) {
    userConfig.requiredActions.push('CONFIGURE_TOTP');
  }

  return userConfig;
};


const sendInvitationEmail = async (kcAdminClient, userId, email) => {
  if (!email) {
    log.warn(`No email provided, skip sending email`, { userId });
    return;
  }

  const requiredActions = ['UPDATE_PASSWORD', 'UPDATE_PROFILE'];

  if (Constants.OPENID.ENABLE_2FA) {
    requiredActions.push('CONFIGURE_TOTP');
  }

  await kcAdminClient.users.executeActionsEmail({
    id: userId,
    actions: requiredActions,
    clientId: Constants.OPENID.CLIENT_ID,
    redirectUri: Constants.CLIENT_URL,
  });

  log.info(`Sent invitation email to ${email}`);
};


const handleKeycloakError = (error, dfspId, context = {}) => {
  const { operation = 'operation', resources = {} } = context;
  log.error(`Error during Keycloak ${operation} for DFSP ${dfspId}:`, error);

  // Re-throw with a consistent format
  throw new InternalError(`Failed to ${operation} for DFSP ${dfspId}: ${error.message}`);
};


const rollbackResources = async (kcAdminClient, dfspId, resources) => {
  const { clientId, userId, dfspGroup } = resources;
  let rollbackErrors = [];

  if (clientId) {
    try {
      await kcAdminClient.clients.del({ id: clientId });
      log.info(`Rolled back: Deleted client for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'client', message: err.message });
    }
  }

  if (userId) {
    try {
      await kcAdminClient.users.del({ id: userId });
      log.info(`Rolled back: Deleted user for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'user', message: err.message });
    }
  }

  // Only delete group if it was created in this session (not an existing one)
  if (dfspGroup && !dfspGroup.preExisting) {
    try {
      await kcAdminClient.groups.del({ id: dfspGroup.id });
      log.info(`Rolled back: Deleted group for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'group', message: err.message });
    }
  }

  if (rollbackErrors.length > 0) {
    log.warn(`Encountered errors during rollback for DFSP ${dfspId}:`, rollbackErrors);
  }

  return rollbackErrors;
};


/**
 * Gets a Keycloak admin client instance
 * @returns {Promise<Object>} Authenticated Keycloak admin client
 */
exports.getKeycloakAdminClient = getKeycloakAdminClient;

/**
 * Creates all Keycloak resources for a DFSP
 *
 * @param {string} dfspId - The DFSP ID
 * @param {string} email - Required DFSP admin/operator email
 * @return {Object} Created resources information
 */
exports.createDfspResources = async (dfspId, email) => {
  formatValidator.validateDfspIdForKeycloak(dfspId);
  const kcAdminClient = await getKeycloakAdminClient();

  let userId = null;
  let clientId = null;
  let dfspGroup = null;

  try {
    dfspGroup = await createDfspGroup(kcAdminClient, dfspId);

    const userToCreate = createUserConfig(email);
    userId = await kcAdminClient.users.create(userToCreate);

    await kcAdminClient.users.addToGroup({
      id: userId.id,
      groupId: dfspGroup.id
    });

    const clientToCreate = createClientConfig(dfspId);
    clientId = await kcAdminClient.clients.create(clientToCreate);

    const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({
      id: clientId.id
    });

    await kcAdminClient.users.addToGroup({
      id: serviceAccount.id,
      groupId: dfspGroup.id,
    });

    if (Constants.KETO.ENABLED) {
      const ketoClient = getKetoClient();
      await ketoClient.createDfspRole(dfspId);
      await ketoClient.assignUserToDfspRole(userId.id, dfspId);
      await ketoClient.assignUserToDfspRole(serviceAccount.id, dfspId);
    }

    await sendInvitationEmail(kcAdminClient, userId.id, email);

    log.info(`Successfully created all Keycloak resources for DFSP ${dfspId}`);
  } catch (error) {
    log.error(`Error creating Keycloak resources for DFSP ${dfspId}:`, error);
    await rollbackResources(kcAdminClient, dfspId, { clientId, userId, dfspGroup });
    throw new InternalError(`Failed to create Keycloak resources for DFSP ${dfspId}: ${error.message}`);
  }
};

/**
 * Deletes all Keycloak resources associated with a DFSP atomically
 *
 * @param {string} dfspId - The DFSP ID
 * @return {Object} Status of deleted resources
 */
exports.deleteDfspResources = async (dfspId) => {
  const kcAdminClient = await getKeycloakAdminClient();

  try {
    const clients = await kcAdminClient.clients.find({
      clientId: dfspId,
      max: 1
    });

    if (clients?.length > 0) {
      const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({
        id: clients[0].id
      });

      if (Constants.ENABLE_KETO) {
        const ketoClient = getKetoClient();
        await ketoClient.removeUserFromDfspRole(serviceAccount.id, dfspId);
      }

      await kcAdminClient.clients.del({
        id: clients[0].id,
      });
      log.info(`Deleted Keycloak client for DFSP ${dfspId}`);
    } else {
      log.info(`No Keycloak client found for DFSP ${dfspId}`);
    }
  } catch (error) {
    log.error(`Error deleting Keycloak client for DFSP ${dfspId}:`, error);
    throw error;
  }

  try {
    // Find users by group membership instead of username
    const applicationGroup = await findApplicationGroup(kcAdminClient);
    const subGroups = await kcAdminClient.groups.listSubGroups({
      parentId: applicationGroup.id,
      max: -1
    });
    const dfspGroup = subGroups.find(g => g.name === getDfspGroupName(dfspId));

    if (dfspGroup?.id) {
      const groupMembers = await kcAdminClient.groups.listMembers({
        id: dfspGroup.id,
        max: -1
      });
      const regularUsers = groupMembers.filter(u => !u.username.startsWith('service-account-'));

      for (const user of regularUsers) {
        // First, remove user from this DFSP group
        await kcAdminClient.users.delFromGroup({
          id: user.id,
          groupId: dfspGroup.id
        });

        if (Constants.ENABLE_KETO) {
          const ketoClient = getKetoClient();
          await ketoClient.removeUserFromDfspRole(user.id, dfspId);
        }

        // Check if user is still a member of any other DFSP groups
        const userGroups = await kcAdminClient.users.listGroups({
          id: user.id,
          max: -1
        });
        const userDfspGroups = userGroups.filter(g => g.name.startsWith(`${Constants.OPENID.GROUPS.DFSP}:`));

        if (userDfspGroups.length === 0) {
          // User has no other DFSP group memberships, safe to delete
          await kcAdminClient.users.del({
            id: user.id
          });
          log.info(`Deleted Keycloak user ${user.username} for DFSP ${dfspId}`);
        } else {
          log.info(`Removed user ${user.username} from DFSP ${dfspId} group, but kept user (still member of ${userDfspGroups.length} other DFSP groups)`);
        }
      }

      if (regularUsers.length === 0) {
        log.info(`No Keycloak users found for DFSP ${dfspId}`);
      }
    } else {
      log.info(`No DFSP group found for ${dfspId}, skipping user deletion`);
    }
  } catch (error) {
    log.error(`Error deleting Keycloak user for DFSP ${dfspId}:`, error);
    throw error;
  }

  try {
    const applicationGroup = await findApplicationGroup(kcAdminClient);
    const subGroups = await kcAdminClient.groups.listSubGroups({
      parentId: applicationGroup.id,
      max: -1
    });
    const dfspGroup = subGroups.find(g => g.name === getDfspGroupName(dfspId));

    if (dfspGroup?.id) {
      if (Constants.ENABLE_KETO) {
        const ketoClient = getKetoClient();
        await ketoClient.deleteDfspRole(dfspId);
      }

      await kcAdminClient.groups.del({
        id: dfspGroup.id
      });
      log.info(`Deleted Keycloak group for DFSP ${dfspId}`);
    } else {
      log.info(`No Keycloak group found for DFSP ${dfspId}`);
    }
  } catch (error) {
    log.error(`Error deleting Keycloak group for DFSP ${dfspId}:`, error);
    throw error;
  }
};
