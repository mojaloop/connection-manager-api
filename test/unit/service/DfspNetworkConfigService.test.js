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


jest.mock('#src/models/DFSPModel');

const DfspNetworkConfigService = require('#src/service/DfspNetworkConfigService');
const DFSPModel = require('#src/models/DFSPModel');
const fixtures = require('#test/fixtures');

describe('DfspNetworkConfigService Tests', () => {
  let mockCtx;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      logger: { child: () => ({ verbose: jest.fn(), info: jest.fn(), error: jest.fn() }) }
    };
  });

  describe('getAllDfspsStatesStatus', () => {
    test('should return DFSPs with states status', async () => {
      const mockRawData = [
        {
          dfsp_id: 'dfsp1',
          pingStatus: 'SUCCESS',
          lastUpdatedPingStatusAt: new Date('2025-01-03T10:00:00.000Z'),
          ...fixtures.mockDfspStatesStatusPayloadDto()
        },
        {
          dfsp_id: 'dfsp2',
          pingStatus: 'TIMED_OUT',
          lastUpdatedPingStatusAt: new Date('2025-01-03T11:00:00.000Z'),
          ...fixtures.mockDfspStatesStatusPayloadDto()
        }
      ];
      mockRawData[0].PEER_JWS = { status: 'completed', stateDescription: 'Configured' };

      const expectedResult = {
        dfsps: [
          {
            dfspId: 'dfsp1',
            pingStatus: 'SUCCESS',
            lastUpdatedPingStatusAt: new Date('2025-01-03T10:00:00.000Z'),
            statesStatus: [
              {
                state: 'PEER_JWS',
                status: 'completed',
                stateDescription: 'Configured',
                lastUpdated: expect.any(String)
              }
            ]
          },
          {
            dfspId: 'dfsp2',
            pingStatus: 'TIMED_OUT',
            lastUpdatedPingStatusAt: new Date('2025-01-03T11:00:00.000Z'),
            statesStatus: []
          }
        ]
      };
      DFSPModel.findAllWithStatesStatus.mockResolvedValue(mockRawData);

      const result = await DfspNetworkConfigService.getAllDfspsStatesStatus(mockCtx);
      expect(result).toEqual(expectedResult);
      expect(DFSPModel.findAllWithStatesStatus).toHaveBeenCalledTimes(1);
    });

    test('should handle empty result', async () => {
      DFSPModel.findAllWithStatesStatus.mockResolvedValue([]);

      const result = await DfspNetworkConfigService.getAllDfspsStatesStatus(mockCtx);
      expect(result).toEqual({ dfsps: [] });
    });

    test('should propagate database errors', async () => {
      const mockError = new Error('Database connection failed');
      DFSPModel.findAllWithStatesStatus.mockRejectedValue(mockError);

      await expect(DfspNetworkConfigService.getAllDfspsStatesStatus(mockCtx))
        .rejects.toThrow('Database connection failed');
    });
  });
});
