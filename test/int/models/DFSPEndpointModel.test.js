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


// import testing helpers
const { setupTestDB, tearDownTestDB } = require('../test-database');

// import module for testing
const DFSPModel = require('../../../src/models/DFSPModel');
const DFSPEndpointModel = require('../../../src/models/DFSPEndpointModel');
const { StatusEnum, DirectionEnum } = require('../../../src/service/DfspNetworkConfigService');
const database = require('../../../src/db/database');
const { logger } = require('../../../src/log/logger');

describe('DFSPEndpointModel', function () {
  beforeAll(async () => {
    await database.knex('dfsp_endpoint').del();
    await setupTestDB();
  });

  afterAll(async () => {
    await tearDownTestDB();
  });

  describe('DFSPEndpointModel', function () {
    let dfspData = null;
    let endpointData = null;
    const endpointIdList = [];

    beforeEach(async () => {
      // Setup

      dfspData = [
        {
          dfsp_id: 'dfsp.inbound.test.1',
          name: 'dfsp.inbound.test.1',
          monetaryZoneId: 'EUR',
        },
        {
          dfsp_id: 'dfsp.inbound.test.2',
          name: 'dfsp.inbound.test.2',
          monetaryZoneId: 'EUR',
        }
      ];

      endpointData = {
        id: null,
        dfsp_id: dfspData[0].dfsp_id,
        state: StatusEnum.NOT_STARTED,
        direction: DirectionEnum.EGRESS,
        value: {
          ipList: [
            {
              description: 'Notification Callback Egress IP & Ports',
              address: '163.10.24.28/30',
              ports: [
                '80',
                '8000-8080'
              ]
            }
          ]
        }
      };

      for (const dfsp of dfspData) {
        logger.debug(`creating dfsp record=${dfsp.dfsp_id}`);
        const dfspCreateResult = await DFSPModel.create(dfsp);
        logger.debug(`dfspCreateResult=${dfspCreateResult}`);
      }
    });

    afterEach(async () => {
      // Cleanup

      logger.debug('deleting dfsp records');
      for (const dfsp of dfspData) {
        logger.debug(`deleting dfsp record=${dfsp.dfsp_id}`);
        await DFSPModel.delete(dfsp.dfsp_id);
      }
      logger.debug(`deleting endpointList=${JSON.stringify(endpointIdList)}`);
      for (const endpointId of endpointIdList) {
        const id = Array.isArray(endpointId) ? endpointId[0] : endpointId;
        logger.debug(`deleting endpoint record=${id}`);
        await DFSPEndpointModel.delete(id);
      }
    });

    it('should return latest endpoints for multiple DFSPs from findAllLatestByDirection', async () => {
      // Arrange
      const dfsp1Endpoint = await DFSPEndpointModel.create(dfspData[0].dfsp_id, StatusEnum.NOT_STARTED, DirectionEnum.EGRESS, endpointData.value);
      const dfsp2Endpoint = await DFSPEndpointModel.create(dfspData[1].dfsp_id, StatusEnum.NOT_STARTED, DirectionEnum.EGRESS, endpointData.value);
      endpointIdList.push(dfsp1Endpoint, dfsp2Endpoint);

      // Act
      const result = await DFSPEndpointModel.findAllLatestByDirection(DirectionEnum.EGRESS);

      // Assert
      expect(result.length).toBe(2);
      expect(result.some(r => r.dfsp_id === dfspData[0].dfsp_id)).toBe(true);
      expect(result.some(r => r.dfsp_id === dfspData[1].dfsp_id)).toBe(true);
      result.forEach(endpoint => {
        expect(endpoint.direction).toBe(DirectionEnum.EGRESS);
        expect(endpoint.state).toBe(StatusEnum.NOT_STARTED);
        expect(endpoint.ipList).toEqual(endpointData.value.ipList);
      });
    });

    it('should return only latest endpoint when multiple exist for same DFSP', async () => {
      // Arrange
      const oldEndpoint = await DFSPEndpointModel.create(dfspData[0].dfsp_id, StatusEnum.NOT_STARTED, DirectionEnum.EGRESS, endpointData.value);
      const latestEndpoint = await DFSPEndpointModel.create(dfspData[0].dfsp_id, StatusEnum.COMPLETED, DirectionEnum.EGRESS, endpointData.value);
      endpointIdList.push(oldEndpoint, latestEndpoint);

      // Act
      const result = await DFSPEndpointModel.findLastestByDirection(dfspData[0].dfsp_id, DirectionEnum.EGRESS);

      // Assert
      expect(result.id).toBe(Array.isArray(latestEndpoint) ? latestEndpoint[0] : latestEndpoint);
      expect(result.state).toBe(StatusEnum.COMPLETED);
      expect(result.id).not.toBe(oldEndpoint);
    });

    it('should throw NotFoundError when getting endpoint for non-existent DFSP', async () => {
      // Act & Assert
      await expect(DFSPEndpointModel.findAllByDirection('fake.dfsp', DirectionEnum.EGRESS))
        .rejects.toHaveProperty('name', 'NotFoundError');
    });

    it('should create a valid Endpoint configuration', async () => {
      // Act

      // DFSPEndpointModel.create = async (id, state, direction, value) => {
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult=${endpointData.id}`);

      const result = await DFSPEndpointModel.findById(endpointData.id);

      // Assert
      expect(result.id).toBe(Array.isArray(endpointData.id) ? endpointData.id[0] : endpointData.id);
      expect(result.dfsp_id).toBe(endpointData.dfsp_id);
      expect(result.direction).toBe(endpointData.direction);
      expect(result.state).toBe(endpointData.state);
      expect(result.created_by).toBeNull();
      expect(result.ipList).toEqual(endpointData.value.ipList);
    });

    it('should return latest Endpoint config record from findLastestByDirection ordered by dfsp_endpoint.id', async () => {
      // Act

      // DFSPEndpointModel.create = async (id, state, direction, value) => {
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.1=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.2=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.3=${endpointData.id}`);

      const result = await DFSPEndpointModel.findLastestByDirection(endpointData.dfsp_id, DirectionEnum.EGRESS);
      logger.debug(result);

      // Assert
      expect(result.id).toBe(Array.isArray(endpointData.id) ? endpointData.id[0] : endpointData.id);
      expect(result.dfsp_id).toBe(endpointData.dfsp_id);
      expect(result.direction).toBe(endpointData.direction);
      expect(result.state).toBe(endpointData.state);
      expect(result.created_by).toBeNull();
      expect(result.ipList).toEqual(endpointData.value.ipList);
    });

    it('should return all results by direction from findAllByDirection', async () => {
      // Act

      // DFSPEndpointModel.create = async (id, state, direction, value) => {
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.1=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.2=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, endpointData.direction, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.3=${endpointData.id}`);

      const result = await DFSPEndpointModel.findAllByDirection(endpointData.dfsp_id, DirectionEnum.EGRESS);
      logger.debug(result);

      // Assert
      expect(result.length).toBe(3);
      let endPointerIdIndex = endpointIdList.length - 3;
      for (const item of result) {
        expect(item.id).toBe(Array.isArray(endpointIdList[endPointerIdIndex]) ? endpointIdList[endPointerIdIndex][0] : endpointIdList[endPointerIdIndex]);
        endPointerIdIndex++; // lets incr the index pointer
        expect(item.dfsp_id).toBe(endpointData.dfsp_id);
        expect(item.direction).toBe(endpointData.direction);
        expect(item.state).toBe(endpointData.state);
        expect(item.created_by).toBeNull();
        expect(item.ipList).toEqual(endpointData.value.ipList);
      }
    });

    it('should return all results from findAll', async () => {
      // Act

      // DFSPEndpointModel.create = async (id, state, direction, value) => {
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, DirectionEnum.EGRESS, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.1=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, DirectionEnum.INGRESS, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.2=${endpointData.id}`);
      endpointData.id = await DFSPEndpointModel.create(endpointData.dfsp_id, endpointData.state, DirectionEnum.EGRESS, endpointData.value);
      endpointIdList.push(endpointData.id);
      logger.debug(`endpointCreateResult.3=${endpointData.id}`);

      const result = await DFSPEndpointModel.findAll(endpointData.dfsp_id);
      logger.debug(result);

      // Assert
      expect(result.length).toBe(3);
      let endPointerIdIndex = endpointIdList.length - 3;
      for (const item of result) {
        expect(item.id).toBe(Array.isArray(endpointIdList[endPointerIdIndex]) ? endpointIdList[endPointerIdIndex][0] : endpointIdList[endPointerIdIndex]);
        endPointerIdIndex++; // lets incr the index pointer
        expect(item.dfsp_id).toBe(endpointData.dfsp_id);
        expect([DirectionEnum.EGRESS, DirectionEnum.INGRESS]).toContain(item.direction);
        expect(item.state).toBe(endpointData.state);
        expect(item.created_by).toBeNull();
        expect(item.ipList).toEqual(endpointData.value.ipList);
      }
    });

    it('should throw NotFoundError when no endpoint exists for findLastestByDirection', async () => {
      // Arrange
      const nonExistentDfspId = 'non.existent.dfsp';

      // Act & Assert
      await expect(DFSPEndpointModel.findLastestByDirection(nonExistentDfspId, DirectionEnum.EGRESS))
        .rejects.toHaveProperty('name', 'NotFoundError');
    });

    it('should throw NotFoundError when getting non-existent endpoint by id', async () => {
      // Arrange
      const nonExistentId = 999999;

      // Act & Assert
      await expect(DFSPEndpointModel.findById(nonExistentId))
        .rejects.toHaveProperty('name', 'NotFoundError');
    });

    it('should return empty array when no endpoints exist for findAllByDirection', async () => {
      // Act
      const result = await DFSPEndpointModel.findAllByDirection(dfspData[1].dfsp_id, DirectionEnum.EGRESS);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no endpoints exist for findAllLatestByDirection', async () => {
      // Act
      const result = await DFSPEndpointModel.findAllLatestByDirection(DirectionEnum.INGRESS);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
