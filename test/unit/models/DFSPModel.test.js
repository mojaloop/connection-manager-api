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


jest.mock('#src/db/database', () => ({
  executeWithErrorCount: jest.fn()
}));
const DFSPModel = require('#src/models/DFSPModel');
const mockDb = require('#src/db/database');
const fixtures = require('#test/fixtures');

describe('DFSPModel Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllWithStatesStatus', () => {
    test('should return DFSPs with states status', async () => {
      const mockResult = [
        {
          dfsp_id: 'dfsp1',
          pingStatus: 'SUCCESS',
          lastUpdatedPingStatusAt: new Date('2025-01-03T10:00:00.000Z'),
          ...fixtures.mockDfspStatesStatusPayloadDto({
            state: { status: 'completed', stateDescription: 'Configured', lastUpdated: '2025-01-03T10:00:00.000Z' }
          })
        },
        {
          dfsp_id: 'dfsp2',
          pingStatus: 'TIMED_OUT',
          lastUpdatedPingStatusAt: new Date('2025-01-03T11:00:00.000Z'),
          ...fixtures.mockDfspStatesStatusPayloadDto()
        }
      ];
      mockDb.executeWithErrorCount.mockResolvedValue(mockResult);

      const result = await DFSPModel.findAllWithStatesStatus();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockResult[0]);
      expect(result[1]).toEqual(mockResult[1]);
    });

    test('should handle empty result', async () => {
      mockDb.executeWithErrorCount.mockResolvedValue([]);
      const result = await DFSPModel.findAllWithStatesStatus();
      expect(result).toHaveLength(0);
    });
  });
});
