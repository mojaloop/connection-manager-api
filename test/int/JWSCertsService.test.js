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

const sinon = require('sinon');
const forge = require('node-forge');
const { switchId } = require('../../src/constants/Constants');
const JWSCertsService = require('../../src/service/JWSCertsService');
const ExternalDFSPModel = require('../../src/models/ExternalDFSPModel');
const PkiService = require('../../src/service/PkiService');
const NotFoundError = require('../../src/errors/NotFoundError');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const DFSPModel = require('../../src/models/DFSPModel');
const ValidationError = require('../../src/errors/ValidationError');
const database = require('../../src/db/database');
const { logger } = require('../../src/log/logger');
const { setupTestDB, tearDownTestDB } = require('../int/test-database');
const { createContext, destroyContext } = require('../int/context');
const { createUniqueDfsp } = require('./test-helpers');

describe('JWSCertsService Tests', () => {
  let ctx;
  let publicKey;

  beforeAll(async () => {
    await setupTestDB();
    await database.knex('dfsps').del();
    ctx = await createContext();
    const keypair = forge.rsa.generateKeyPair({ bits: 2048 });
    publicKey = forge.pki.publicKeyToPem(keypair.publicKey, 72);
  });

  beforeEach(async () => {
    // Reset the database before each test
    await database.knex('dfsps').del();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('JWS Certificates', () => {
    let dfspId = null;

    it('should create a DfspJWSCerts entry', async () => {
      const body = { publicKey };
      const dfsp = createUniqueDfsp();
      await PkiService.createDFSP(ctx, dfsp);
      dfspId = dfsp.dfspId;
      const result = await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      expect(result.publicKey).toBe(publicKey);
      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      logger.debug(certs);
      await PkiService.deleteDFSP(ctx, dfspId);
      const certs2 = await JWSCertsService.getAllDfspJWSCerts(ctx);
      logger.debug(certs2);
    }, 30000);

    it('should set a hub JWSCerts', async () => {
      const body = { publicKey };
      const dfsp = createUniqueDfsp();
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      const result = await JWSCertsService.createDfspJWSCerts(ctx, resultDfsp.id, body);
      expect(result.publicKey).toBe(publicKey);

      const keyData = await JWSCertsService.getDfspJWSCerts(ctx, resultDfsp.id);
      logger.debug(keyData);
      expect(keyData.dfspId).toBe(resultDfsp.id);
      expect(keyData.publicKey).toBe(publicKey);
      expect(keyData.validationState).toBe('VALID');

      const allKeysData = await JWSCertsService.getAllDfspJWSCerts(ctx);
      logger.debug(allKeysData);
      const dfspKey = allKeysData.find(k => k.dfspId === resultDfsp.id);
      expect(dfspKey).toBeDefined();

      await JWSCertsService.deleteDfspJWSCerts(ctx, resultDfsp.id);
      await PkiService.deleteDFSP(ctx, resultDfsp.id);
    }, 30000);

    it('should create and delete a DfspJWSCerts entry', async () => {
      const body = { publicKey };
      const dfsp = createUniqueDfsp();
      await PkiService.createDFSP(ctx, dfsp);
      dfspId = dfsp.dfspId;
      await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      await JWSCertsService.deleteDfspJWSCerts(ctx, dfspId);
      await expect(JWSCertsService.getDfspJWSCerts(ctx, dfspId)).rejects.toBeInstanceOf(NotFoundError);
      await PkiService.deleteDFSP(ctx, dfspId);
    }, 30000);

    it('should create and find several dfsps certs and dfspId shouldnt be null', async () => {
      const body = { publicKey };

      const N_DFSPS = 20;
      const dfspIds = [];

      // Ensure cleanup before test execution
      await Promise.all(
        Array.from({ length: N_DFSPS }).map(async (_, i) => {
          const dfspId = `DFSP_TEST${i}`;
          await PkiService.deleteDFSP(ctx, dfspId).catch(() => {}); // Ignore errors if DFSP doesn't exist
        })
      );

      for (let i = 0; i < N_DFSPS; i++) {
        const dfspId = `DFSP_TEST${i}`;

        try {
          await PkiService.createDFSP(ctx, createUniqueDfsp({ dfspId }));
          dfspIds.push(dfspId);
          await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
        } catch (error) {
          logger.error(`Error creating DFSP ${dfspId}:`, error);
        }
      }

      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      const retrievedDfspIds = certs.map(cert => cert.dfspId);

      logger.debug("Retrieved DFSP IDs:", retrievedDfspIds);

      dfspIds.forEach(dfspId => {
        expect(retrievedDfspIds).toContain(dfspId);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(ctx, id)));
    }, 30000);

    it('should create a DfspExternalJWSCerts entries', async () => {
      const body = [
        {
          dfspId: 'EXT_DFSP_TEST1',
          publicKey,
          createdAt: Math.floor(Date.now() / 1000)
        },
        {
          dfspId: 'EXT_DFSP_TEST2',
          publicKey,
          createdAt: Math.floor(Date.now() / 1000)
        }
      ];
      const result = await JWSCertsService.createDfspExternalJWSCerts(ctx, body);
      expect(result.length).toBe(2);
      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      expect(certs.map(cert => cert.dfspId)).toContain('EXT_DFSP_TEST1');
      expect(certs.map(cert => cert.dfspId)).toContain('EXT_DFSP_TEST2');
    }, 30000);

    it('should create a DfspExternalJWSCerts entries and db entries when source dfsp is passed in header', async () => {
      const body = [
        {
          dfspId: 'EXT_DFSP_TEST3',
          publicKey,
          createdAt: Math.floor(Date.now() / 1000)
        },
        {
          dfspId: 'EXT_DFSP_TEST4',
          publicKey,
          createdAt: Math.floor(Date.now() / 1000)
        }
      ];
      const sourceDfsp = 'DFSP_TEST';
      const result = await JWSCertsService.createDfspExternalJWSCerts(ctx, body, sourceDfsp);
      expect(result.length).toBe(2);
      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      expect(certs.map(cert => cert.dfspId)).toContain('EXT_DFSP_TEST3');
      expect(certs.map(cert => cert.dfspId)).toContain('EXT_DFSP_TEST4');
      const externalDfsps = await ExternalDFSPModel.findAll();
      expect(externalDfsps.length).toBe(2);
    }, 30000);

    it('should throw an error with a wrong key size', async () => {
      const body = { publicKey: publicKey.replace('A', '') };
      const dfsp = createUniqueDfsp();
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      expect(result.validations).not.toBeNull();
      expect(result.validationState).not.toBeNull();
      expect(result.validationState).toBe(ValidationCodes.VALID_STATES.INVALID);
      await PkiService.deleteDFSP(ctx, dfspId);
    }, 30000);
  });

  it('should throw ValidationError when body is null or undefined in createDfspJWSCerts', async () => {
    await expect(JWSCertsService.createDfspJWSCerts(ctx, 'DFSP_TEST', null)).rejects.toBeInstanceOf(ValidationError);
    await expect(JWSCertsService.createDfspJWSCerts(ctx, 'DFSP_TEST', undefined)).rejects.toBeInstanceOf(ValidationError);
  }, 30000);

  it('should throw ValidationError when body is null or undefined in createDfspExternalJWSCerts', async () => {
    await expect(JWSCertsService.createDfspExternalJWSCerts(ctx, null)).rejects.toBeInstanceOf(ValidationError);
    await expect(JWSCertsService.createDfspExternalJWSCerts(ctx, undefined)).rejects.toBeInstanceOf(ValidationError);
  }, 30000);

  it('should throw ValidationError when body is not an array or empty in createDfspExternalJWSCerts', async () => {
    await expect(JWSCertsService.createDfspExternalJWSCerts(ctx, {})).rejects.toBeInstanceOf(ValidationError);
    await expect(JWSCertsService.createDfspExternalJWSCerts(ctx, [])).rejects.toBeInstanceOf(ValidationError);
  }, 30000);

  it('should get hub JWS certs', async () => {
    const body = { publicKey };
    const dfsp = createUniqueDfsp();
    await PkiService.createDFSP(ctx, dfsp);
    await JWSCertsService.createDfspJWSCerts(ctx, dfsp.dfspId, body);
    const keyData = await JWSCertsService.getDfspJWSCerts(ctx, dfsp.dfspId);
    expect(keyData.dfspId).toBe(dfsp.dfspId);
    expect(keyData.publicKey).toBe(publicKey);
    expect(keyData.validationState).toBe('VALID');
    await PkiService.deleteDFSP(ctx, dfsp.dfspId);
  }, 30000);

  it('should delete DFSP JWS certs', async () => {
    const body = { publicKey };
    const dfsp = createUniqueDfsp();
    await PkiService.createDFSP(ctx, dfsp);
    await JWSCertsService.createDfspJWSCerts(ctx, dfsp.dfspId, body);
    await JWSCertsService.deleteDfspJWSCerts(ctx, dfsp.dfspId);

    await expect(JWSCertsService.getDfspJWSCerts(ctx, dfsp.dfspId)).rejects.toBeInstanceOf(NotFoundError);

    await PkiService.deleteDFSP(ctx, dfsp.dfspId);
  }, 30000);

  it('should get all DFSP JWS certs', async () => {
    const body = { publicKey };
    const dfsp = createUniqueDfsp();
    const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
    const dfspId = resultDfsp.id;
    await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
    const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
    expect(Array.isArray(certs)).toBe(true);
    expect(certs.length).toBeGreaterThan(0);
    await PkiService.deleteDFSP(ctx, dfspId);
  }, 30000);

});

describe('JWSCertsService - setHubJWSCerts', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        validateJWSCertificate: sinon.stub(),
        setDFSPJWSCerts: sinon.stub(),
      }
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should set JWS certs if DFSP for hub exists', async () => {
    const body = { publicKey: 'dummy-public-key' };

    sinon.stub(DFSPModel, 'findByDfspId').resolves({ id: switchId });

    const createDfspJWSCertsStub = sinon.stub(JWSCertsService, 'createDfspJWSCerts').resolves({ publicKey: body.publicKey });

    const result = await JWSCertsService.setHubJWSCerts(ctx, body);

    expect(createDfspJWSCertsStub.calledOnceWith(ctx, switchId, body)).toBe(true);
    expect(result.publicKey).toBe(body.publicKey);
  });

  it('should create DFSP for hub if not found and set JWS certs', async () => {
    const body = { publicKey: 'dummy-public-key' };

    sinon.stub(DFSPModel, 'findByDfspId').rejects(new NotFoundError());

    const createDFSPStub = sinon.stub(PkiService, 'createDFSPWithCSR').resolves();

    const createDfspJWSCertsStub = sinon.stub(JWSCertsService, 'createDfspJWSCerts').resolves({ publicKey: body.publicKey });

    const result = await JWSCertsService.setHubJWSCerts(ctx, body);

    expect(createDFSPStub.calledOnceWith(ctx, { dfspId: switchId, name: switchId, email: `${switchId}@hub.local` })).toBe(true);
    expect(createDfspJWSCertsStub.calledOnceWith(ctx, switchId, body)).toBe(true);
    expect(result.publicKey).toBe(body.publicKey);
  });

  it('should create DFSP when findByDfspId returns null (unexpected case)', async () => {
    const body = { publicKey: 'dummy-public-key' };

    sinon.stub(DFSPModel, 'findByDfspId').resolves(null);

    const createDFSPStub = sinon.stub(PkiService, 'createDFSPWithCSR').resolves();

    const createDfspJWSCertsStub = sinon.stub(JWSCertsService, 'createDfspJWSCerts').resolves({ publicKey: body.publicKey });

    const result = await JWSCertsService.setHubJWSCerts(ctx, body);

    expect(createDFSPStub.calledOnceWith(ctx, { dfspId: switchId, name: switchId, email: `${switchId}@hub.local` })).toBe(true);
    expect(createDfspJWSCertsStub.calledOnceWith(ctx, switchId, body)).toBe(true);
    expect(result.publicKey).toBe(body.publicKey);
  });

  it('should throw an error if findByDfspId throws unexpected error', async () => {
    const body = { publicKey: 'dummy-public-key' };

    sinon.stub(DFSPModel, 'findByDfspId').rejects(new Error('Unexpected DB Error'));

    await expect(JWSCertsService.setHubJWSCerts(ctx, body)).rejects.toThrow('Unexpected DB Error');
  });

  it('should throw an error if createDfspJWSCerts fails', async () => {
    const body = { publicKey: 'dummy-public-key' };

    sinon.stub(DFSPModel, 'findByDfspId').resolves({ id: switchId });
    sinon.stub(JWSCertsService, 'createDfspJWSCerts').rejects(new Error('Test Error'));

    await expect(JWSCertsService.setHubJWSCerts(ctx, body)).rejects.toThrow('Test Error');
  });

  describe('JWSCertsService - rotateHubJWSCerts', () => {
    let ctx;

    beforeEach(() => {
      ctx = {};
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should successfully rotate hub JWS certs when hubJwsCertManager is configured', async () => {
      const renewServerCertStub = sinon.stub().resolves();
      ctx.hubJwsCertManager = {
        renewServerCert: renewServerCertStub
      };

      const result = await JWSCertsService.rotateHubJWSCerts(ctx);

      expect(renewServerCertStub.calledOnce).toBe(true);
      expect(result).toEqual({ message: 'Hub JWS certificate rotation triggered' });
    });

    it('should throw an error when hubJwsCertManager is not configured', async () => {
      ctx.hubJwsCertManager = null;

      await expect(JWSCertsService.rotateHubJWSCerts(ctx)).rejects.toThrow('Hub JWS CertManager is not configured');
    });

    it('should throw an error when hubJwsCertManager is undefined', async () => {
      ctx.hubJwsCertManager = undefined;

      await expect(JWSCertsService.rotateHubJWSCerts(ctx)).rejects.toThrow('Hub JWS CertManager is not configured');
    });

    it('should propagate error when renewServerCert fails', async () => {
      const renewServerCertStub = sinon.stub().rejects(new Error('Certificate renewal failed'));
      ctx.hubJwsCertManager = {
        renewServerCert: renewServerCertStub
      };

      await expect(JWSCertsService.rotateHubJWSCerts(ctx)).rejects.toThrow('Certificate renewal failed');
      expect(renewServerCertStub.calledOnce).toBe(true);
    });

    it('should propagate custom error when renewServerCert fails with specific message', async () => {
      const customError = new Error('Invalid certificate authority');
      const renewServerCertStub = sinon.stub().rejects(customError);
      ctx.hubJwsCertManager = {
        renewServerCert: renewServerCertStub
      };

      await expect(JWSCertsService.rotateHubJWSCerts(ctx)).rejects.toThrow('Invalid certificate authority');
      expect(renewServerCertStub.calledOnce).toBe(true);
    });
  });
});
