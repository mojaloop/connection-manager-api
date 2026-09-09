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
const { validateIPAddressInput, validatePorts, validateURLInput } = require('../utils/formatValidator');
const { logger } = require('../log/logger');
const { DFSP_STATES } = require('../constants/constValues');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');
const PkiService = require('./PkiService');
const DFSPModel = require('../models/DFSPModel');
const DFSPEndpointItemModel = require('../models/DFSPEndpointItemModel');
const DFSPEndpointModel = require('../models/DFSPEndpointModel');

const log = logger.child({ component: 'DfspNetworkConfigService' });

const StatusEnum = Object.freeze({ NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' });
const PhaseEnum = Object.freeze({ BUSINESS_SETUP: 'BUSINESS_SETUP', TECNICAL_SETUP: 'TECNICAL_SETUP' });
const StepEnum = Object.freeze({ ID_GENERATION: 'ID_GENERATION', ENDPOINTS: 'ENDPOINTS', CSR_EXCHANGE: 'CSR_EXCHANGE', CERTIFICATE_AUTHORITY: 'CERTIFICATE_AUTHORITY', SERVER_CERTIFICATES_EXCHANGE: 'SERVER_CERTIFICATES_EXCHANGE', JWS_CERTIFICATES: 'JWS_CERTIFICATES' });
const DirectionEnum = Object.freeze({ EGRESS: 'EGRESS', INGRESS: 'INGRESS' });

// export enums for unit
exports.StatusEnum = StatusEnum;
exports.PhaseEnum = PhaseEnum;
exports.StepEnum = StepEnum;
exports.DirectionEnum = DirectionEnum;

/**
 * Internal function to transform endpoint results from DFSPEndpointModel to API DFSPEndpoint response
 * dfspId String ID of dfsp
 * returns inline_response_200_1
 **/
const transformEndpointModeltoApiRes = (endpointMode) => {
  const { // lets filter out endpointMode properties
    id,

    dfsp_id,

    created_by,

    created_at,
    state,
    direction, // we are going to ignore this!
    ...config
  } = endpointMode;

  return { // map endpointMode properties to API specification
    id,

    dfspId: dfsp_id,
    state,

    createdBy: created_by,

    createdAt: created_at,
    ...config
  };
};

/**
 * Returns the Environment DFSP Status based on configured information for dfspId
 * dfspId String ID of dfsp
 * returns inline_response_200_1
 **/
exports.getDfspStatus = async (ctx, dfspId) => {
  const envStatus = [
    {
      phase: 'BUSINESS_SETUP',
      steps: [
        {
          identifier: 'ID_GENERATION',
          status: 'NOT_STARTED'
        }
      ]
    },
    {
      phase: 'TECHNICAL_SETUP',
      steps: [
        {
          identifier: 'ENDPOINTS',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'CSR_EXCHANGE',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'CERTIFICATE_AUTHORITY',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'SERVER_CERTIFICATES_EXCHANGE',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'JWS_CERTIFICATES',
          status: 'NOT_STARTED'
        }
      ]
    }
  ];
  let dfsp = [];
  let endpoints = [];
  // const csrexch = [];
  // const csrexchin = [];
  // const csrexchout = [];
  // const ca = [];
  // const servercerts = [];
  // const jwscerts = [];

  try {
    // ID_GENERATION
    dfsp = await DFSPModel.findByDfspId(dfspId);

    // ENDPOINTS
    endpoints = await DFSPEndpointItemModel.findObjectAll(dfspId);

    log.debug('endpoints:', endpoints);

    // CSR
    // csrexchout = await DfspOutboundEnrollmentModel.findAllDfsp(dfspId);
    //  log.debug('csrexchout:', csrexchout);
    //
    //  csrexchin = await DfspInboundEnrollmentModel.findAllDfsp(dfspId);
    //  log.debug('csrexchin:', csrexchin);

    // SERVER_CERTIFICATES_EXCHANGE
    // servercerts = await DfspServerCertsModel.findDfspId(dfspId);
    //  log.debug('servercerts:', servercerts);

    // JWS_CERTIFICATES
    //  jwscerts = await DfspJWSCertsModel.findDfspId(dfspId);
    //  log.debug('jwscerts:', jwscerts);

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`Status for environment: dfsp: ${dfspId} not found`);
    }
    throw error;
  }

  if (dfsp.id != null && dfsp.name != null) {
    const bs = envStatus.filter(phase => phase.phase === PhaseEnum.BUSINESS_SETUP);
    const s = bs[0].steps.filter(step => step.identifier === StepEnum.ID_GENERATION);
    s[0].status = StatusEnum.COMPLETED;
  }

  return envStatus;
};

/**
 * Creates a DFSPEndpoint, used by the createDFSPEgressIP and createDFSPIngressIP methods
 *
 * @param {String} dfspId DFSP id
 * @param {IPEntry} body IPEntry
 * @param {String{'EGRESS'|'INGRESS'}} direction
 */
const createDFSPIp = async (ctx, dfspId, body, direction) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const inputIpEntry = body.value;
  if (!inputIpEntry.address) {
    throw new ValidationError('No address received');
  }
  if (!inputIpEntry.ports) {
    throw new ValidationError('No ports received');
  }
  if (!Array.isArray(inputIpEntry.ports)) {
    throw new ValidationError('No ports array received');
  }
  if (!inputIpEntry.ports.length === 0) {
    throw new ValidationError('Empty ports array received');
  }
  validateIPAddressInput(inputIpEntry.address);
  validatePorts(inputIpEntry.ports);

  const endpointItem = {
    state: 'NEW',
    type: 'IP',
    value: JSON.stringify(inputIpEntry),
    dfspId,
    direction,
  };
  return endpointItem;
};

/**
 * Adds a new configuration to the DFSP Endpoint Egress
 *
 * @param {String} dfspId DFSP id
 * @param body {Object} DFSPEgress
 * @returns BaseEndpoint + DFSPEgress
 **/
exports.createDFSPEgress = async (ctx, dfspId, body) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const resultId = await DFSPEndpointModel.create(dfspId, StatusEnum.NOT_STARTED, DirectionEnum.EGRESS, body);
  return transformEndpointModeltoApiRes(await DFSPEndpointModel.findById(resultId));
};

/**
 * Get configuration for the DFSP Endpoint Egress
 *
 * @param {String} dfspId DFSP id
 * @returns BaseEndpoint + DFSPEgress
 **/
exports.getDFSPEgress = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const result = await DFSPEndpointModel.findLastestByDirection(dfspId, DirectionEnum.EGRESS);
  if (result == null) throw new NotFoundError('Endpoint configuration not found!');
  return transformEndpointModeltoApiRes(result);
};

/**
 * Adds a new IP entry to the DFSP Egress endpoint
 *
 * @param {String} dfspId DFSP id
 * @param body {Object} DFSPIngress
 * @returns BaseEndpoint + DFSPIngress
 **/
exports.createDFSPEgressIp = async (ctx, dfspId, body) => {
  const endpointItem = await createDFSPIp(ctx, dfspId, body, 'EGRESS');
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * Adds a new configuration to DFSP Endpoint Ingress
 *
 * @param {String} dfspId DFSP id
 * @param body {Object} DFSPIngress
 * @returns BaseEndpoint + DFSPIngress
 **/
exports.createDFSPIngress = async (ctx, dfspId, body) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const resultId = await DFSPEndpointModel.create(dfspId, StatusEnum.NOT_STARTED, DirectionEnum.INGRESS, body);
  return transformEndpointModeltoApiRes(await DFSPEndpointModel.findById(resultId));
};

/**
 * Get newc configuration to DFSP Endpoint Ingress
 *
 * @param {String} dfspId DFSP id
 * body InputIP DFSP ingress IP
 * returns DFSPIngress
 **/
exports.getDFSPIngress = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const result = await DFSPEndpointModel.findLastestByDirection(dfspId, DirectionEnum.INGRESS);
  if (result == null) throw new NotFoundError('Endpoint configuration not found!');
  return transformEndpointModeltoApiRes(result);
};

/**
 * Adds a new IP entry to the DFSP Ingress endpoint
 *
 * @param {String} dfspId DFSP id
 * body InputIP DFSP ingress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPIngressIp = async (ctx, dfspId, body) => {
  const endpointItem = await createDFSPIp(ctx, dfspId, body, 'INGRESS');
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPEgressIps = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('EGRESS', 'IP', dfspId);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPIngressIps = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'IP', dfspId);
};

/**
 * Set the DFSP Ingress URL
 * The DFSP operator sends the ingress URL
 *
 * @param {String} dfspId DFSP id
 * body InputURL DFSP ingress URL
 * returns DFSPEndPointConfigItem
 **/
exports.createDFSPIngressUrl = async (ctx, dfspId, body) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const inputURLAddress = body.value;
  if (!inputURLAddress.url) {
    throw new ValidationError('No URL received');
  }
  validateURLInput(inputURLAddress.url);

  const endpointItem = {
    state: 'NEW',
    type: 'URL',
    value: JSON.stringify(inputURLAddress),
    dfspId,
    direction: 'INGRESS',
  };
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

exports.getDFSPIngressUrls = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL', dfspId);
};

exports.getUnprocessedEndpointItems = async (ctx, visible) => {
  const items = await DFSPEndpointItemModel.findAllEnvState('NEW', visible.restricted ? visible.ids : undefined);
  return items;
};

exports.getUnprocessedDfspItems = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findAllDfspState(dfspId, 'NEW');
};

exports.confirmEndpointItem = async (ctx, dfspId, epId) => DFSPEndpointItemModel.update(dfspId, epId, { state: 'CONFIRMED' });

exports.getDFSPEndpoint = async (ctx, dfspId, epId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findObjectById(epId);
};

exports.getDFSPEndpoints = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  return DFSPEndpointItemModel.findObjectAll(dfspId);
};

/**
 *
 */
exports.updateDFSPEndpoint = async (ctx, dfspId, epId, body) => {
  await PkiService.validateDfsp(ctx, dfspId);
  await DFSPEndpointItemModel.findObjectById(epId);

  if (body.value && body.value.address) {
    validateIPAddressInput(body.value.address);
  }
  if (body.value && body.value.ports) {
    validatePorts(body.value.ports);
  }
  if (body.value && body.value.url) {
    validateURLInput(body.value.url);
  }

  const endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  endpointItem.dfsp_id = await DFSPModel.findIdByDfspId(dfspId);

  return DFSPEndpointItemModel.update(dfspId, epId, endpointItem);
};

exports.deleteDFSPEndpoint = async (ctx, dfspId, epId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  await DFSPEndpointItemModel.findObjectById(epId);
  await DFSPEndpointItemModel.delete(epId);
};

/**
 * Validates dfspId and the epId has the same direction and type as the parameters
 *
 * @param {Enum 'INGRESS' or 'EGRESS'} direction
 * @param {Enum 'IP' or 'ADDRESS'} type
 * @param {*} epId
 * @param {String} dfspId DFSP id
 */
const validateDirectionType = async (direction, type, epId, dfspId) => {
  const endpoint = await exports.getDFSPEndpoint(dfspId, epId);
  if (endpoint.direction !== direction) {
    throw new ValidationError(`Wrong direction ${direction}, endpoint has already ${endpoint.direction}`);
  }
  if (endpoint.type !== type) {
    throw new ValidationError(`Wrong type ${type}, endpoint has already ${endpoint.type}`);
  }
};

exports.getDFSPIngressIpEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPIngressIpEndpoint = async (ctx, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPIngressIpEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};

exports.getDFSPEgressIpEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPEgressIpEndpoint = async (ctx, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'EGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'EGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPEgressIpEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};

exports.getDFSPIngressUrlEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPIngressUrlEndpoint = async (ctx, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'URL') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'URL';
  }
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPIngressUrlEndpoint = async (ctx, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};

exports.uploadDfspStatesStatus = async (ctx, dfspId, body) => {
  try {
    log.verbose('uploadDfspStatesStatus...', { dfspId, body });

    const dfsp = await DFSPModel.findByDfspId(dfspId);
    if (!dfsp) {
      const error = new Error(`DFSP '${dfspId}' not found`);
      error.status = 404;
      throw error;
    }

    const upsertResult = await DFSPModel.upsertStatesStatus(dfspId, body);
    const code = upsertResult[0]?.affectedRows || 0; // 1 - insert, 2 - update
    log.info(`uploadDfspStatesStatus is done:`, { code, dfspId });
    return { code };
  } catch (err) {
    log.error(`error in uploadDfspStatesStatus: `, err);
    throw err;
  }
};

exports.getAllDfspsStatesStatus = async (ctx, visible) => {
  try {
    log.verbose('getAllDfspsStatesStatus...');
    const rawData = await DFSPModel.findAllWithStatesStatus(visible.restricted ? visible.ids : undefined);

    const dfsps = rawData.map(row => {
      const statesStatus = [];

      DFSP_STATES.forEach(key => {
        if (row[key]) {
          statesStatus.push({
            state: key,
            ...row[key],
            lastUpdated: row[key].lastUpdated || new Date().toISOString()
          });
        }
      });

      return {
        dfspId: row.dfsp_id,
        pingStatus: row.pingStatus,
        lastUpdatedPingStatusAt: row.lastUpdatedPingStatusAt,
        statesStatus
      };
    });

    log.info(`getAllDfspsStatesStatus returned ${dfsps.length} DFSPs`);
    return { dfsps };
  } catch (err) {
    log.error(`error in getAllDfspsStatesStatus: `, err);
    throw err;
  }
};
