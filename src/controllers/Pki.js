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

const utils = require('../utils/writer.js');
const Pki = require('../service/PkiService');
const { getRequestData } = require('../utils/request.js');

exports.createDFSP = (req, res, next) => {
  const { body } = getRequestData(req);
  Pki.createDFSPWithCSR(req.context, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSP = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  Pki.deleteDFSP(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPs = (req, res, next) => {
  Pki.getDFSPs(req.context, req.authz(req, 'dfsps'))
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.setDFSPca = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  Pki.setDFSPca(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPca = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  Pki.getDFSPca(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSP = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  Pki.updateDFSP(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspsByMonetaryZones = (req, res, next) => {
  const { query: { monetaryZoneId } } = getRequestData(req);
  Pki.getDfspsByMonetaryZones(req.context, monetaryZoneId, req.authz(req, 'dfsps'))
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
