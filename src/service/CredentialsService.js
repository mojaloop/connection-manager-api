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

const NotFoundError = require('../errors/NotFoundError');
const DfspIamService = require('./DfspIamService');
const PkiService = require('./PkiService');
const { logger } = require('../log/logger');

const VAULT_PATH_PREFIX = 'api-credentials';

const createCredentials = async (context, dfspId) => {
  try {
    const credentialsPath = `${VAULT_PATH_PREFIX}/${dfspId}`;

    await PkiService.validateDfsp(context, dfspId);
    const { clientId, clientSecret } = await DfspIamService.rotateDfspClientCredentials(dfspId);

    const credentials = {
      client_id: clientId,
      client_secret: clientSecret,
      created_at: new Date().toISOString(),
      dfsp_id: dfspId,
    };

    await context.pkiEngine.setSecret(credentialsPath, credentials);

    logger.info('API credentials created', {
      dfspId,
      action: 'CREATE_CREDENTIALS'
    });

    return {
      data: {
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        createdAt: credentials.created_at
      },
      status: 201
    };

  } catch (error) {
    logger.error('Error creating API credentials:', {
      dfspId,
      error: error.message
    });
    throw error;
  }
};

const getCredentials = async (context, dfspId) => {
  try {
    const credentialsPath = `${VAULT_PATH_PREFIX}/${dfspId}`;
    const credentials = await context.pkiEngine.getSecret(credentialsPath);

    if (!credentials) {
      throw new NotFoundError('API credentials not found for this DFSP');
    }

    logger.info('API credentials retrieved', {
      dfspId,
      action: 'FETCH_CREDENTIALS'
    });

    return {
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret,
      createdAt: credentials.created_at,
      updatedAt: credentials.updated_at
    };

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw NotFoundError as-is
    }
    
    // Check if this is a "not found" type error from Vault
    if (error.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
      throw new NotFoundError('API credentials not found for this DFSP');
    }
    
    logger.error('Error retrieving API credentials:', {
      dfspId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  getCredentials,
  createCredentials
}; 