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
const { setupTestDB, tearDownTestDB } = require('../int/test-database');

const PkiService = require('../../src/service/PkiService');
const ValidationError = require('../../src/errors/ValidationError');
const NotFoundError = require('../../src/errors/NotFoundError');
const { createInternalHubCA, getHubCA } = require('../../src/service/HubCAService');
const { createContext, destroyContext } = require('../int/context');
const { EVERYTHING } = require('@mojaloop/authz');
const database = require('../../src/db/database');
const { createUniqueDfsp } = require('./test-helpers');

const ROOT_CA = {
  CN: 'hub.modusbox.org',
  O: 'Modusbox',
  OU: 'TSP',
  L: '-',
  ST: '-',
  C: '-'
};

describe('PkiService', () => {
  let ctx;
  beforeAll(async () => {
    await setupTestDB();
    ctx = await createContext();
    await database.knex('dfsps').del();
  });

  beforeEach(async () => {
    // Reset the database before each test
    await database.knex('dfsps').del();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('CA', () => {
    it('should throw ValidationError while creating a CA with bogus data', async () => {
      // Bad input
      const caBody = {
        csr: {
          hosts: [
            'http://www.sun.com'
          ],
          dn: { // this one is bogus, it should be names and contain an array
            ST: 'Street',
            C: 'Country',
            OU: 'Organizational Unit',
            CN: 'Common Name',
            L: 'Location',
            O: 'Organization'
          },
          key: {
            size: 2048,
            algo: 'rsa'
          }
        },
        defaults: {
          expiry: '87600h',
          usages: [
            'signing'
          ]
        }
      };
      await expect(createInternalHubCA(ctx, caBody)).rejects.toBeInstanceOf(ValidationError);
    }, 15000);

    it('should create a CA', async () => {
      const result = await createInternalHubCA(ctx, ROOT_CA);
      expect(result.id).not.toBeNull();

      const newCa = await getHubCA(ctx);
      expect(newCa).not.toBeNull();
    }, 15000);

    it('should throw ValidationError when passing a CAInitialInfo without CSR', async () => {
      // Bad input
      const caBody = {
        defaults: {
          expiry: '87600h',
          usages: [
            'signing'
          ]
        }
      };
      await expect(createInternalHubCA(ctx, caBody)).rejects.toBeInstanceOf(ValidationError);
    }, 15000);
  });

  describe('DFSP', () => {
    beforeEach(async () => {
    });

    afterEach(async () => {
    });

    it('should create a DFSP and delete it', async () => {
      const dfsp = createUniqueDfsp();
      const result = await PkiService.createDFSP(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
    });

    it('should reject a DFSP ID with spaces', async () => {
      const baseDfsp = createUniqueDfsp();
      const dfspIdWithSpace = `${baseDfsp.dfspId.slice(0, 5)} ${baseDfsp.dfspId.slice(5)}`;
      const dfsp = { ...baseDfsp, dfspId: dfspIdWithSpace };

      await expect(PkiService.createDFSP(ctx, dfsp)).rejects.toThrow();
    });

    it('should create a DFSP with MZ', async () => {
      const dfsp = createUniqueDfsp({ monetaryZoneId: 'EUR' });
      const result = await PkiService.createDFSP(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBe(dfsp.monetaryZoneId);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
    });

    it('should create a DFSP without MZ and then add it', async () => {
      const dfsp = createUniqueDfsp();

      await PkiService.createDFSP(ctx, dfsp);

      // remove the mz
      const newDfsp = { dfspId: dfsp.dfspId, monetaryZoneId: 'MAD' };
      const result = await PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp);
      expect(result.name).toBe(dfsp.name);
      expect(result.monetaryZoneId).toBe('MAD');

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBe('MAD');
      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      expect(deleted).toBe(1);
    });

    it('should create a DFSP with MZ and then remove it', async () => {
      const dfsp = createUniqueDfsp({ monetaryZoneId: 'EUR' });
      await PkiService.createDFSP(ctx, dfsp);

      // remove the mz
      const newDfsp = { ...dfsp, monetaryZoneId: null };
      const result = await PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp);
      expect(result.name).toBe(dfsp.name);
      expect(result.monetaryZoneId).toBeUndefined();

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBeUndefined();

      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      expect(deleted).toBe(1);
    });

    it('should throw NotFoundError when getting a non-existent DFSP', async () => {
      await expect(PkiService.getDFSPById(ctx, 'non-existent-dfsp')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NotFoundError when deleting a non-existent DFSP', async () => {
      await expect(PkiService.deleteDFSP(ctx, 'non-existent-dfsp')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should get all DFSPs', async () => {
      const dfsp1 = createUniqueDfsp();
      const dfsp2 = createUniqueDfsp();

      await PkiService.createDFSP(ctx, dfsp1);
      await PkiService.createDFSP(ctx, dfsp2);

      const dfsps = await PkiService.getDFSPs(ctx, EVERYTHING);
      expect(Array.isArray(dfsps)).toBe(true);
      expect(dfsps).toHaveLength(2);
    });

    it('should get DFSPs by monetary zone', async () => {
      const dfsp1 = createUniqueDfsp({ monetaryZoneId: 'EUR' });
      const dfsp2 = createUniqueDfsp({ monetaryZoneId: 'USD' });

      await PkiService.createDFSP(ctx, dfsp1);
      await PkiService.createDFSP(ctx, dfsp2);

      const dfsps = await PkiService.getDfspsByMonetaryZones(ctx, 'EUR', EVERYTHING);
      expect(Array.isArray(dfsps)).toBe(true);
      expect(dfsps).toHaveLength(1);
      expect(dfsps[0].monetaryZoneId).toBe('EUR');
    });

    it('should create a DFSP with CSR and delete it', async () => {
      const dfsp = createUniqueDfsp();
      const result = await PkiService.createDFSPWithCSR(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
    }, 30000);
  });
});
