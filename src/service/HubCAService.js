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
const PkiService = require('./PkiService');
const ValidationCodes = require('../pki_engine/ValidationCodes');
const ValidationError = require('../errors/ValidationError');
const constants = require('../constants/Constants');

const formatBody = (body, pkiEngine) => {
  return {
    type: body.type,
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && pkiEngine.getCertInfo(body.rootCertificate),
    intermediateChain: body.intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(body.intermediateChain, pkiEngine),
  };
};

exports.createInternalHubCA = async (ctx, body, ttl) => {
  const { pkiEngine, certManager, hubJwsCertManager } = ctx;

  if (!ttl) {
    // ttl is falsy, we assume this means it was not provided. use env var or default.
    ttl = constants.vault.internalCaTtl;
  }

  const { cert } = await pkiEngine.createCA(body, ttl);
  const certInfo = pkiEngine.getCertInfo(cert);

  const info = {
    type: 'INTERNAL',
    rootCertificate: cert,
    rootCertificateInfo: certInfo,
  };

  await pkiEngine.setHubCACertDetails(info);

  if (certManager) {
    await certManager.renewServerCert();
    if (hubJwsCertManager) {
      await hubJwsCertManager.renewServerCert();
    }
  }

  return info;
};

exports.createExternalHubCA = async (ctx, body) => {
  const { pkiEngine, certManager, hubJwsCertManager } = ctx;

  const rootCertificate = body.rootCertificate || '';
  const intermediateChain = body.intermediateChain || '';
  const { privateKey } = body;
  if (!privateKey) {
    throw new ValidationError('Missing "privateKey" property');
  }

  const { validations, validationState } = await pkiEngine.validateCACertificate(rootCertificate, intermediateChain, privateKey);

  const info = {
    ...formatBody(body, pkiEngine),
    validations,
    validationState,
  };

  if (validationState === ValidationCodes.VALID_STATES.VALID) {
    await pkiEngine.setHubCaCertChain(rootCertificate + intermediateChain, privateKey);
    await pkiEngine.setHubCACertDetails(info);
  }

  if (certManager) {
    await certManager.renewServerCert();
    if (hubJwsCertManager) {
      await hubJwsCertManager.renewServerCert();
    }
  }
  return info;
};

exports.getHubCA = async (ctx) => {
  const { pkiEngine } = ctx;
  const ca = await pkiEngine.getRootCaCert();
  return {
    rootCertificate: ca,
    validationState: 'VALID',
    type: 'INTERNAL',
  };
};

exports.getHubCAInfo = async (ctx) => {
  const { pkiEngine } = ctx;
  return pkiEngine.getHubCACertDetails();
};

exports.deleteHubCA = async (ctx) => {
  const { pkiEngine } = ctx;
  await pkiEngine.deleteHubCACertDetails();
  await pkiEngine.deleteCA();
};
