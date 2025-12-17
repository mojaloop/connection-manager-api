/** ************************************************************************
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
 *  limitations under the License.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Sridevi Miriyala - sridevi.miriyala@modusbox.com                **
 *
 *  CONTRIBUTORS:                                                      *
 *       Miguel de Barros - miguel.debarros@modusbox.com                **
 ************************************************************************* */

import { ApiHelper, MethodEnum, ApiHelperOptions } from '../util/api-helper';
import Config from '../util/config';

describe('MCM API Tests', () => {

  let dfspId: string;

  const randomSeed = Math.floor(Math.random() * (10000 - 1)) + 1;

  const dfspObject = {
    dfspId: `test${randomSeed}`,
    name: `test${randomSeed}`,
    monetaryZoneId: 'XTS',
    isProxy: false,
    email: `test${randomSeed}@example.com`
  }

  const apiHelperOptions: ApiHelperOptions = {};
  if (Config.username && Config.password){
    apiHelperOptions.login = {
      username: Config.username,
      password: Config.password,
      baseUrl: Config.mcmEndpoint
    }
  }

  const apiHelper = new ApiHelper(apiHelperOptions);

  beforeAll(async () => {
    // lets see if the DFSP already exists
    const getDFSPResponse = await apiHelper.sendRequest({
      method: MethodEnum.GET,
      url:`${Config.mcmEndpoint}/dfsps`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (getDFSPResponse.status == 200) {
      // filter results
      const result = getDFSPResponse?.data.filter( (dfspRecord: any) => {
        return dfspRecord.id === dfspObject.dfspId
      })
      // if we find it, set the dfspId value
      if (result?.length === 1) dfspId = result[0]?.id
    }

    // if not found, we should create it
    if (dfspId == null) {
      const addDFSPResponse = await apiHelper.getResponseBody({
        method: MethodEnum.POST,
        url:`${Config.mcmEndpoint}/dfsps`,
        body: JSON.stringify(dfspObject),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // set the dfspId value
      dfspId = addDFSPResponse.id;
    }

    // Test if we can generate credentials for the DFSP
    const credentialsResponse = await apiHelper.sendRequest({
      method: MethodEnum.POST,
      url:`${Config.mcmEndpoint}/dfsps/${dfspId}/credentials`,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  afterEach(() => {
    // TODO: cleanup test-data
  })

  describe('DFSP Egress Endpoint Configuration should', () => {

    test('MCMAPI.3 - return a 404 when querying a DFSP Endpoint Egress Configuration for a DFSP that does not exist', async () => {
      // ### Setup
      const errorId = 'NotFoundError';
      const errorMessage = 'DFSP with id DFSP_DOES_NOT_EXIST not found';
      const invalidDfspId = 'DFSP_DOES_NOT_EXIST'

      // ### Act
      const response = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${invalidDfspId}/endpoints/egress`,
      });

      // ### Test
      expect(response?.data?.payload?.id).toBe(errorId);
      expect(response?.data?.payload?.message).toBe(errorMessage);
      expect(response?.data?.message).toBe(errorMessage);
      expect(response?.status).toBe(404);
    });

    test('MCMAPI.4 - return a 404 when querying a DFSP Endpoint Egress Configuration that does not exist', async () => {
      // ### Setup
      const errorId = 'NotFoundError';
      const errorMessage = 'Endpoint configuration not found!';

      // ### Act
      const response = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
      });

      // ### Test
      expect(response?.data?.payload?.id).toBe(errorId);
      expect(response?.data?.payload?.message).toBe(errorMessage);
      expect(response?.data?.message).toBe(errorMessage);
      expect(response?.status).toBe(404);
    });

    test('MCMAPI.1 - create DFSP Endpoint Egress Configurations for the first time', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "ipList": [
          {
            "description": "Notification Callback Egress IP & Ports",
            "address": "163.10.24.28/30",
            "ports": [
              "80",
              "8000-8080"
            ]
          }
        ]
      }

      // ### Act
      const createEndpointEgressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const getEgressResponse = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
      });


      // ### Test
      expect(createEndpointEgressResponse.data.dfspId).toBe(dfspId);
      expect(createEndpointEgressResponse.data.id).toBeGreaterThan(0);
      expect(createEndpointEgressResponse.data.state).toBe('NOT_STARTED');
      expect(createEndpointEgressResponse.data).toHaveProperty('createdBy');
      expect(createEndpointEgressResponse.data).toHaveProperty('createdAt');
      expect(createEndpointEgressResponse.data.ipList).toMatchObject(endpoitConfiguration.ipList);
      expect(createEndpointEgressResponse?.status).toBe(200);
      expect(createEndpointEgressResponse.data.id).toBe(getEgressResponse.data.id);
      expect(getEgressResponse?.status).toBe(200);
    });

    test('MCMAPI.2 - create DFSP Endpoint Egress Configurations when an existing record already exists', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "ipList": [
          {
            "description": "Notification Callback Egress IP & Ports",
            "address": "163.10.24.28/30",
            "ports": [
              "80",
              "8000-8080"
            ]
          }
        ]
      }

      // ### Act

      const getEgressResponse = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
      });

      const createEndpointEgressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });

      // ### Test
      expect(getEgressResponse?.status).toBe(200);

      expect(createEndpointEgressResponse.data.dfspId).toBe(dfspId);
      expect(createEndpointEgressResponse.data.id).toBeGreaterThan(0);
      expect(createEndpointEgressResponse.data.state).toBe('NOT_STARTED');
      expect(createEndpointEgressResponse.data).toHaveProperty('createdBy');
      expect(createEndpointEgressResponse.data).toHaveProperty('createdAt');
      expect(createEndpointEgressResponse.data.ipList).toMatchObject(endpoitConfiguration.ipList);
      expect(createEndpointEgressResponse?.status).toBe(200);
      expect(createEndpointEgressResponse.data.id).toBeGreaterThan(getEgressResponse.data.id);
    });

    test('MCMAPI.9 - create DFSP Endpoint Egress Configurations with invalid request', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "ipList": [
          {
            "description": "Notification Callback Egress IP & Ports",
            "address": "163.10.24.28/30",
            "ports": [
              "80",
              "8000-8080"
            ]
          }
        ],
        "SHOULD": "NOT_EXIST"
      }

      // ### Act
      const createEndpointEgressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });


      // ### Test
      expect(createEndpointEgressResponse.data.message).toContain('request.body should NOT have additional properties');
      expect(createEndpointEgressResponse?.status).toBe(400);
    });
  });

  describe('DFSP Egress Ingress Configuration should', () => {

    test('MCMAPI.7 - return a 404 when querying a DFSP Endpoint Ingress Configuration for a DFSP that does not exist', async () => {
      // ### Setup
      const errorId = 'NotFoundError';
      const errorMessage = 'DFSP with id DFSP_DOES_NOT_EXIST not found';
      const invalidDfspId = 'DFSP_DOES_NOT_EXIST'

      // ### Act
      const response = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${invalidDfspId}/endpoints/ingress`,
      });

      // ### Test
      expect(response?.data?.payload?.id).toBe(errorId);
      expect(response?.data?.payload?.message).toBe(errorMessage);
      expect(response?.data?.message).toBe(errorMessage);
      expect(response?.status).toBe(404);
    });

    test('MCMAPI.8 - return a 404 when querying a DFSP Endpoint Ingress Configuration that does not exist', async () => {
      // ### Setup
      const errorId = 'NotFoundError';
      const errorMessage = 'Endpoint configuration not found!';

      // ### Act
      const response = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
      });

      // ### Test
      expect(response?.data?.payload?.id).toBe(errorId);
      expect(response?.data?.payload?.message).toBe(errorMessage);
      expect(response?.data?.message).toBe(errorMessage);
      expect(response?.status).toBe(404);
    });

    test('MCMAPI.5 - create DFSP Endpoint Ingress Configurations for the first time', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "url": `http://local.test.${randomSeed}`
      }

      // ### Act
      const createEndpointIngressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const getIngressResponse = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
      });


      // ### Test
      expect(createEndpointIngressResponse.data.dfspId).toBe(dfspId);
      expect(createEndpointIngressResponse.data.id).toBeGreaterThan(0);
      expect(createEndpointIngressResponse.data.state).toBe('NOT_STARTED');
      expect(createEndpointIngressResponse.data).toHaveProperty('createdBy');
      expect(createEndpointIngressResponse.data).toHaveProperty('createdAt');
      expect(createEndpointIngressResponse.data.url).toBe(endpoitConfiguration.url);
      expect(createEndpointIngressResponse?.status).toBe(200);
      expect(createEndpointIngressResponse.data.id).toBe(getIngressResponse.data.id);
      expect(getIngressResponse?.status).toBe(200);
    });

    test('MCMAPI.6 - create DFSP Endpoint Egress Configurations when an existing record already exists', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "url": `http://local.test.${randomSeed}`
      }

      // ### Act

      const getIngressResponse = await apiHelper.sendRequest({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
      });

      const createEndpointIngressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });

      // ### Test
      expect(getIngressResponse?.status).toBe(200);

      expect(createEndpointIngressResponse.data.dfspId).toBe(dfspId);
      expect(createEndpointIngressResponse.data.id).toBeGreaterThan(0);
      expect(createEndpointIngressResponse.data.state).toBe('NOT_STARTED');
      expect(createEndpointIngressResponse.data).toHaveProperty('createdBy');
      expect(createEndpointIngressResponse.data).toHaveProperty('createdAt');
      expect(createEndpointIngressResponse.data.url).toBe(endpoitConfiguration.url);
      expect(createEndpointIngressResponse?.status).toBe(200);
      expect(createEndpointIngressResponse.data.id).toBeGreaterThan(getIngressResponse.data.id);
    });

    test('MCMAPI.10 - create DFSP Endpoint Ingress Configurations with invalid request', async () => {
      // ### Setup
      const endpoitConfiguration = {
        "url": `http://local.test.${randomSeed}`,
        "SHOULD": "NOT_EXIST"
      }

      // ### Act
      const createEndpointIngressResponse = await apiHelper.sendRequest({
        method: 'POST',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/egress`,
        body: JSON.stringify(endpoitConfiguration),
        headers: {
          'Content-Type': 'application/json'
        },
      });


      // ### Test
      expect(createEndpointIngressResponse.data.message).toContain('request.body should NOT have additional properties');
      expect(createEndpointIngressResponse?.status).toBe(400);
    });
  });

  describe('DFSPs states status endpoint Tests', () => {
    test('should get proper response', async () => {
      const { status, data } = await apiHelper.sendRequest({
        method: MethodEnum.GET,
        url:`${Config.mcmEndpoint}/dfsps/states-status`,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(status).toBe(200);
      expect(Array.isArray(data.dfsps)).toBe(true);
      expect(data.dfsps.length).toBeGreaterThan(0);
      data.dfsps.forEach((_: any) => {
        expect(typeof _.dfspId).toBe('string');
        expect(_.pingStatus).toBeNull();
        expect(_.statesStatus).toEqual([]);
      });
    })
  });
});
