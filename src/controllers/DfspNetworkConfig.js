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
const DfspNetworkConfig = require('../service/DfspNetworkConfigService');
const { getRequestData } = require('../utils/request.js');

exports.getDfspStatus = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDfspStatus(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgress = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPEgress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgress = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEgress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgressIp = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPEgressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressIp = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPIngressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressUrl = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPIngressUrl(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedEndpointItems = (req, res, next) => {
  DfspNetworkConfig.getUnprocessedEndpointItems(req.context, req.authz(req, 'dfsps'))
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedDfspItems = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getUnprocessedDfspItems(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.confirmEndpointItem = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.confirmEndpointItem(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrls = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressUrls(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIps = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIps = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEgressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.deleteDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoints = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEndpoints(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngress = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPIngress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngress = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIpEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressIpEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPIngressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.getDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEgressIpEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPEgressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEgressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrlEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.getDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressUrlEndpoint = (req, res, next) => {
  const { body, params: { dfspId , epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPIngressUrlEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressUrlEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.uploadDfspStatesStatus = (req, res) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.uploadDfspStatesStatus(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.handleGetDfspsStatesStatus = (req, res, next) => {
  DfspNetworkConfig.getAllDfspsStatesStatus(req.context, req.authz(req, 'dfsps'))
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
