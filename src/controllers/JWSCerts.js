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

const utils = require('../utils/writer.js');
const JWSCertsService = require('../service/JWSCertsService');
const { getRequestData } = require('../utils/request.js');

/**
 * The DFSP a request is made on behalf of, read from the gateway-supplied
 * visible set. A caller standing for exactly one DFSP is that DFSP; a hub
 * caller sees every DFSP and stands for none, so the entries it reports carry
 * no source.
 */
const callerDfspId = (req) => {
  const dfsps = req.authz(req, 'dfsps');
  return dfsps.restricted && dfsps.ids.length === 1 ? dfsps.ids[0] : undefined;
};

exports.createDfspJWSCerts = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  JWSCertsService.createDfspJWSCerts(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDfspExternalJWSCerts = (req, res, next) => {
  const { body } = getRequestData(req);
  JWSCertsService.createDfspExternalJWSCerts(req.context, body, callerDfspId(req))
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.setHubJWSCerts = (req, res, next) => {
  const { body } = getRequestData(req);
  JWSCertsService.setHubJWSCerts(req.context, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspJWSCerts = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  JWSCertsService.getDfspJWSCerts(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.rotateHubJWSCerts = (req, res, next) => {
  JWSCertsService.rotateHubJWSCerts(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response);
    });
};

exports.getHubJWSCerts = (req, res, next) => {
  JWSCertsService.getHubJWSCerts(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getAllDfspJWSCerts = (req, res, next) => {
  JWSCertsService.getAllDfspJWSCerts(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDfspJWSCerts = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  JWSCertsService.deleteDfspJWSCerts(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
