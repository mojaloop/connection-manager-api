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
 *  limitations under the License                                             *
 ******************************************************************************/

'use strict';
const { enableCustomRootCAs } = require('./utils/tlsUtils');
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const OpenApiValidator = require('express-openapi-validator');
const { createGuard } = require('@mojaloop/authz');
const { createWinstonLogger, logger } = require('./log/logger');
const AuthMiddleware = require('./middleware/AuthMiddleware');
const DfspIdValidationMiddleware = require('./middleware/DfspIdValidationMiddleware');
const HubCAService = require('./service/HubCAService');
const ServerCertsService = require('./service/ServerCertsService');

const db = require('./db/database');
const corsUtils = require('./utils/corsUtils');

const Constants = require('./constants/Constants');
const PKIEngine = require('./pki_engine/VaultPKIEngine');
const NotFoundError = require('./errors/NotFoundError');
const CertManager = require('./pki_engine/CertManager');

/**
 * Handlers are found by the operationId they are exported under, which the
 * document already declares and keeps unique. Building the index once turns a
 * name exported twice into a startup failure.
 */
const indexHandlers = (handlersPath) => {
  const handlers = new Map();
  for (const file of fs.readdirSync(handlersPath).filter((f) => f.endsWith('.js'))) {
    const module = require(path.join(handlersPath, file));
    for (const [operationId, handler] of Object.entries(module)) {
      if (typeof handler !== 'function') continue;
      const owner = handlers.get(operationId);
      if (owner) throw new Error(`${operationId} is exported by both ${owner.file} and ${file}`);
      handlers.set(operationId, { handler, file });
    }
  }
  return handlers;
};

const resolveHandler = (handlers) => (handlersPath, route, apiDoc) => {
  const pathKey = route.openApiRoute.substring(route.basePath.length);
  const { operationId } = apiDoc.paths[pathKey][route.method.toLowerCase()];
  const found = handlers.get(operationId);
  if (!found) {
    throw new Error(`no controller exports ${operationId} for ${route.method} ${route.expressRoute}`);
  }
  return found.handler;
};

exports.connect = async () => {
  await db.connect();
  await executeSSLCustomLogic();

  const app = express();
  const controllersPath = path.join(__dirname, './controllers');

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();

  let certManager, hubJwsCertManager;
  if (Constants.certManager.enabled) {
    const {
      serverCertSecretName,
      serverCertSecretNamespace,
      jwsHubCertSecretName,
      jwsHubCertSecretNamespace
    } = Constants.certManager;

    certManager = new CertManager({
      serverCertSecretName,
      serverCertSecretNamespace,
      logger,
    });
    await certManager.initK8s();

    if (jwsHubCertSecretName && jwsHubCertSecretNamespace) {
      hubJwsCertManager = new CertManager({
        serverCertSecretName: jwsHubCertSecretName,
        serverCertSecretNamespace: jwsHubCertSecretNamespace,
        logger,
      });
      await hubJwsCertManager.initK8s();
    }
  }

  let rootCA;
  const ctx = { pkiEngine, certManager, hubJwsCertManager };
  try {
    rootCA = await HubCAService.getHubCA(ctx);
  } catch (e) {
    if (!(e instanceof NotFoundError)) {
      throw e;
    }
  }
  if (!rootCA?.rootCertificate) {
    await HubCAService.createInternalHubCA(ctx, Constants.caCsrParameters);
  }

  let hubServerCert;
  try {
    hubServerCert = await ServerCertsService.getHubServerCerts(ctx);
  } catch (e) {
    if (!(e instanceof NotFoundError)) {
      throw e;
    }
  }
  if (!hubServerCert?.serverCertificate) {
    await ServerCertsService.createHubServerCerts(ctx);
  }

  // Body parsers come before anything that reads a body, which the validator
  // does. The limits are body-parser's defaults.
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text());

  app.use((req, res, next) => {
    req.context = { pkiEngine, certManager, hubJwsCertManager, db: db.knex };
    next();
  });
  app.use(cors(corsUtils.getCorsOptions));
  app.use(createWinstonLogger());

  if (Constants.dfspIdHeaderValidationEnabled) {
    app.use(DfspIdValidationMiddleware.createDfspIdValidationMiddleware());
  }

  // Every handler asks req.authz what its caller may reach, so it is on the
  // request before the routes are
  const authz = await createGuard(path.join(__dirname, 'api/openapi.yaml'));
  app.use(AuthMiddleware.createHeaderTrustMiddleware(authz));

  app.use(
    OpenApiValidator.middleware({
      apiSpec: path.join(__dirname, 'api/openapi.yaml'),
      validateRequests: true,
      validateResponses: false,
      // The gateway authenticated and authorized the request before it
      // reached this process; the document's security schemes are what the
      // generator derives those gateway rules from.
      validateSecurity: false,
      operationHandlers: {
        basePath: controllersPath,
        resolver: resolveHandler(indexHandlers(controllersPath)),
      },
    })
  );

  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message, errors: err.errors });
  });

  return app;
};

/**
 * Load custom SSL Logic to issue and process CSRs and Certificates
 */
async function executeSSLCustomLogic () {
  enableCustomRootCAs();
}
