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

const PKIEngine = require('#src/pki_engine/VaultPKIEngine');
const { vault: vaultConfig, vaultPaths } = require('#src/constants/Constants');
const { logger } = require('#src/log/logger');

/**
 * Copies JWS certificate keys in Vault from numeric database IDs to DFSP string identifiers.
 * For each numeric key, looks up the corresponding DFSP ID and copies the certificate data
 * to the new path. Original numeric keys are preserved as backup.
 *
 * @param {Map<string, string>} dfspDbMap - Mapping from database ID (string) to DFSP ID
 * @param {VaultPKIEngine} pkiEngine - Connected PKI engine instance for Vault operations
 *  @returns {Promise<{errors: number, copied: number, skipped: number}>} Migration result summary
 *
 * @description
 * Migration behavior:
 * - Skips if no DFSP found for numeric key
 * - Skips if target DFSP ID path already exists
 * - Copies certificate data from source to target
 * - Keeps original numeric keys as backup (does not delete)
 * - Logs warnings for skipped entries and errors
 */
const copyVaultSecretsToDfspIdPath = async (dfspDbMap, pkiEngine) => {
  let copied = 0;
  let errors = 0;
  let skipped = 0;

  // List numeric JWS certificate keys in Vault
  const allKeys = await pkiEngine.listSecrets(vaultPaths.JWS_CERTS);
  const numericKeys = allKeys.filter(key => /^\d+$/.test(key));

  if (numericKeys.length === 0) {
    logger.info('✅ No numeric keys found - migration not needed!');
    return { errors, copied, skipped, };
  }

  for (const dbId of numericKeys) {
    try {
      const dfspId = dfspDbMap.get(dbId);
      if (!dfspId) {
        logger.warn(`⚠️  Skipping dbId ${dbId}: No DFSP found in database`);
        skipped++;
        continue;
      }

      // Check if target already exists
      if (allKeys.includes(dfspId)) {
        logger.warn(`⚠️  Skipping dbId ${dbId} → ${dfspId}: Target already exists`);
        skipped++;
        continue;
      }

      const certData = await pkiEngine.getSecret(`${vaultPaths.JWS_CERTS}/${dbId}`);
      await pkiEngine.setSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`, certData);

      logger.info(`✅ Migrated: dbId ${dbId} → dfspId ${dfspId}`);
      copied++;
      // Note: Old numeric keys are kept as backup
    } catch (error) {
      logger.warn(`❌ Error migrating dbId ${dbId}: `, error);
      errors++;
    }
  }

  return Object.freeze({ errors, copied, skipped });
};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  logger.info('starting JWS Vault Migration: dbId → dfspId');
  let pkiEngine;

  try {
    pkiEngine = new PKIEngine(vaultConfig);
    await pkiEngine.connect();
    logger.info('✅ Vault connected successfully');

    // Query all DFSPs from database
    const dfsps = await knex('dfsps').select('id', 'dfsp_id');
    const dfspDbMap = new Map(dfsps.map(d => [
      String(d.id), d.dfsp_id
    ]));
    logger.info(`📊 Found ${dfsps.length} DFSPs in database: `, { dfspDbMap: Object.fromEntries(dfspDbMap) });

    const { errors, copied, skipped } = await copyVaultSecretsToDfspIdPath(dfspDbMap, pkiEngine);
    logger.info(`migration completed: `, { errors, copied, skipped });

    if (errors > 0) {
      throw new Error(`Migration finished with ${errors} error(s)`);
    }
  } catch (err) {
    logger.error('❌ MIGRATION FAILED: ', err);
    throw err; // todo: think, if we need to rethrow errors inside migration
  } finally {
    if (pkiEngine) {
      pkiEngine.disconnect();
      logger.info('vault disconnected');
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  logger.warn('⚠️  Rollback not supported for JWS Vault Migration');
};
