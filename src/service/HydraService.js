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

const crypto = require('node:crypto');
const { Configuration, OAuth2Api } = require('@ory/hydra-client');
const Constants = require('../constants/Constants');
const InternalError = require('../errors/InternalError');
const NotFoundError = require('../errors/NotFoundError');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'HydraService' });

let clientCache = null;
const getOAuth2Client = () => {
  if (!clientCache) {
    const config = new Configuration({ basePath: Constants.HYDRA.ADMIN_URL });
    clientCache = new OAuth2Api(config);
  }
  return clientCache;
};

const generateSecret = () => crypto.randomBytes(32).toString('base64url');

// Hydra SDK expects snake_case fields, including an explicit client_id
const buildClientBody = (dfspId, clientSecret) => ({
  client_id: dfspId,
  client_secret: clientSecret,
  client_name: `PM4ML client for DFSP ${dfspId}`,
  grant_types: ['client_credentials'],
  response_types: [],
  token_endpoint_auth_method: 'client_secret_basic',
  audience: [Constants.HYDRA.AUDIENCE],
  scope: 'openid',
  metadata: {
    dfspId,
    purpose: 'pm4ml-api-integration',
  },
});

const handleApiError = (error, operation, dfspId) => {
  const status = error?.response?.status;
  const body = error?.response?.data;
  log.error(`Hydra ${operation} failed for DFSP ${dfspId}`, { status, body, message: error.message });
  if (status === 404) {
    throw new NotFoundError(`Hydra client not found for DFSP ${dfspId}`);
  }
  throw new InternalError(`Failed to ${operation} for DFSP ${dfspId}: ${error.message}`);
};

/**
 * Creates a Hydra OAuth2 client for a PM4ML DFSP using client_credentials.
 * If a client with the same client_id already exists, returns the existing client_id
 * (secret can be rotated separately via rotateClientSecret).
 *
 * @param {string} dfspId
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
exports.createPM4MLClient = async (dfspId) => {
  const api = getOAuth2Client();
  const clientSecret = generateSecret();
  try {
    const { data } = await api.createOAuth2Client({ oAuth2Client: buildClientBody(dfspId, clientSecret) });
    log.info(`Created Hydra OAuth2 client for DFSP ${dfspId}`);
    return { clientId: data.client_id || dfspId, clientSecret };
  } catch (error) {
    if (error?.response?.status === 409) {
      log.info(`Hydra client already exists for DFSP ${dfspId}, rotating secret`);
      return exports.rotateClientSecret(dfspId);
    }
    handleApiError(error, 'createPM4MLClient', dfspId);
  }
};

/**
 * Rotates the client_secret on an existing Hydra OAuth2 client.
 *
 * @param {string} dfspId
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
exports.rotateClientSecret = async (dfspId) => {
  const api = getOAuth2Client();
  const clientSecret = generateSecret();
  try {
    await api.setOAuth2Client({ id: dfspId, oAuth2Client: buildClientBody(dfspId, clientSecret) });
    log.info(`Rotated Hydra client secret for DFSP ${dfspId}`);
    return { clientId: dfspId, clientSecret };
  } catch (error) {
    handleApiError(error, 'rotateClientSecret', dfspId);
  }
};

/**
 * Deletes the Hydra OAuth2 client for a DFSP. No-op when absent.
 *
 * @param {string} dfspId
 */
exports.deleteClient = async (dfspId) => {
  const api = getOAuth2Client();
  try {
    await api.deleteOAuth2Client({ id: dfspId });
    log.info(`Deleted Hydra OAuth2 client for DFSP ${dfspId}`);
  } catch (error) {
    if (error?.response?.status === 404) {
      log.info(`No Hydra client to delete for DFSP ${dfspId}`);
      return;
    }
    handleApiError(error, 'deleteClient', dfspId);
  }
};

/**
 * Returns the Hydra OAuth2 client metadata for a DFSP, or null if not found.
 *
 * @param {string} dfspId
 */
exports.getClient = async (dfspId) => {
  const api = getOAuth2Client();
  try {
    const { data } = await api.getOAuth2Client({ id: dfspId });
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    handleApiError(error, 'getClient', dfspId);
  }
};
