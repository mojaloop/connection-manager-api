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


const DfspNetworkConfigController = require('#src/controllers/DfspNetworkConfig');
const utils = require('../../../src/utils/writer.js');
const DfspNetworkConfigService = require('../../../src/service/DfspNetworkConfigService');

jest.mock('../../../src/utils/writer.js', () => ({
  writeJson: jest.fn()
}));

jest.mock('../../../src/service/DfspNetworkConfigService', () => ({
  getAllDfspsStatesStatus: jest.fn()
}));

describe('DfspNetworkConfig Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      context: {
        pkiEngine: {},
        certManager: {}
      }
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetDfspsStatesStatus', () => {
    test('should call service and return response on success', async () => {
      const mockResponse = {
        dfsps: [
          {
            dfspId: 'test-dfsp',
            pingStatus: 'SUCCESS',
            lastUpdatedPingStatusAt: '2025-01-03T10:00:00.000Z',
            statesStatus: [
              {
                state: 'PEER_JWS',
                status: 'completed',
                lastUpdated: '2025-01-03T10:00:00.000Z'
              }
            ]
          }
        ]
      };
      DfspNetworkConfigService.getAllDfspsStatesStatus.mockResolvedValue(mockResponse);

      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(DfspNetworkConfigService.getAllDfspsStatesStatus).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(mockRes, mockResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle service errors', async () => {
      const mockError = { status: 500, message: 'Database error' };
      DfspNetworkConfigService.getAllDfspsStatesStatus.mockRejectedValue(mockError);

      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(DfspNetworkConfigService.getAllDfspsStatesStatus).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(mockRes, mockError, mockError.status);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass correct context to service', async () => {
      const mockResponse = { dfsps: [] };
      DfspNetworkConfigService.getAllDfspsStatesStatus.mockResolvedValue(mockResponse);

      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(DfspNetworkConfigService.getAllDfspsStatesStatus).toHaveBeenCalledWith(mockReq.context);
    });
  });
});
