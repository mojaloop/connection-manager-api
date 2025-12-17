/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

'use strict';
const DFSPModel = require('../models/DFSPModel');
const ExternalDFSPModel = require('../models/ExternalDFSPModel');
const PkiService = require('./PkiService');
const NotFoundError = require('../errors/NotFoundError');
const ValidationError = require('../errors/ValidationError');
const { switchId, switchEmail } = require('../constants/Constants');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'JWSCertsService' });

exports.createDfspJWSCerts = async (ctx, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }

  await PkiService.validateDfsp(ctx, dfspId);

  const { pkiEngine } = ctx;
  const { validations, validationState } = pkiEngine.validateJWSCertificate(body.publicKey);
  const jwsData = {
    dfspId,
    publicKey: body.publicKey,
    createdAt: body.createdAt,
    validations,
    validationState,
  };
  await DFSPModel.findIdByDfspId(dfspId);
  log.info('dfsp is found in db', { dfspId });

  await pkiEngine.setDFSPJWSCerts(dfspId, jwsData);
  return jwsData;
};

exports.createDfspExternalJWSCerts = async (ctx, body, sourceDfspId) => {
  if (body === null || typeof body === 'undefined' || !Array.isArray(body) || body.length === 0) {
    throw new ValidationError(`Invalid body ${body}`);
  }

  // Filter out the DFSPs that are not external
  const nativeDfsps = await PkiService.getDFSPs();
  const nativeDfspIdList = nativeDfsps.map(dfsp => dfsp.id);
  const externalDfspList = body.filter(dfspJwsItem => !nativeDfspIdList.includes(dfspJwsItem.dfspId));

  const { pkiEngine } = ctx;
  const result = [];

  for (let i = 0; i < externalDfspList.length; i++) {
    const dfspJwsItem = externalDfspList[i];
    const { dfspId, publicKey } = dfspJwsItem;
    const { validations, validationState } = pkiEngine.validateJWSCertificate(publicKey);
    const jwsData = {
      dfspId,
      publicKey,
      createdAt: dfspJwsItem.createdAt || 0,
      validations,
      validationState,
    };
    await pkiEngine.setDFSPExternalJWSCerts(dfspId, jwsData);
    if (sourceDfspId) {
      const externalDfspItem = {
        external_dfsp_id: dfspId,
        source_dfsp_id: sourceDfspId,
        updated_at: new Date(),
      };
      await ExternalDFSPModel.upsert(externalDfspItem);
    }
    result.push(jwsData);
  }

  return result;
};

exports.setHubJWSCerts = async (ctx, body) => {
  const switchData = await DFSPModel.findByDfspId(switchId)
    .catch(err => {
      if (err instanceof NotFoundError) {
        log.debug('Hub DFSP not found, will create it');
        return null;
      }
      log.error('Error on getting hub DFSP', err);
      throw err;
    });
  // (?) think, if it's better to create DFSP for hub on service start
  if (!switchData) {
    log.info('No DFSP for hub, creating new one...');
    await PkiService.createDFSPWithCSR(ctx, {
      dfspId: switchId,
      name: switchId,
      email: switchEmail,
    });
  }

  return exports.createDfspJWSCerts(ctx, switchId, body);
};

exports.rotateHubJWSCerts = async (ctx) => {
  const { hubJwsCertManager } = ctx;
  if (!hubJwsCertManager) {
    throw new Error('Hub JWS CertManager is not configured');
  }
  await hubJwsCertManager.renewServerCert();
  return { message: 'Hub JWS certificate rotation triggered' };
};

exports.getDfspJWSCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  return pkiEngine.getDFSPJWSCerts(dfspId);
};

exports.getHubJWSCerts = async (ctx) => {
  return exports.getDfspJWSCerts(ctx, switchId);
};

exports.deleteDfspJWSCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  await pkiEngine.deleteDFSPJWSCerts(dfspId);
};

exports.getAllDfspJWSCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  return pkiEngine.getAllDFSPJWSCerts();
};
