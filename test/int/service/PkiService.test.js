const PkiService = require('../../../src/service/PkiService');
const DFSPModel = require('../../../src/models/DFSPModel');
const InternalError = require('../../../src/errors/InternalError');
const ValidationError = require('../../../src/errors/ValidationError');
const NotFoundError = require('../../../src/errors/NotFoundError');
const { createCSRAndDFSPOutboundEnrollment } = require('../../../src/service/DfspOutboundService');
const { createUniqueDfsp } = require('../test-helpers');
const { EVERYTHING, restrictedTo } = require('@mojaloop/authz');

jest.mock('../../../src/models/DFSPModel');
jest.mock('../../../src/service/DfspOutboundService');

describe('PkiService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks && jest.restoreAllMocks();
  });

  describe('createDFSP', () => {
    it('should create a DFSP and return its id', async () => {
      const ctx = {};
      const { dfspId, email } = createUniqueDfsp();
      const body = {
        dfspId,
        name: 'Test DFSP',
        email,
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      DFSPModel.create.mockResolvedValue({ dfsp_id: body.dfspId });
      DFSPModel.createFxpSupportedCurrencies.mockResolvedValue();

      const result = await PkiService.createDFSP(ctx, body);
      expect(result).toEqual({ id: body.dfspId });
    });

    it('should throw an InternalError if DFSP creation fails', async () => {
      const ctx = {};
      const { dfspId, email } = createUniqueDfsp();
      const body = {
        dfspId,
        name: 'Test DFSP',
        email,
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      DFSPModel.create.mockImplementation(() => { throw new Error('DB Error'); });

      await expect(PkiService.createDFSP(ctx, body))
        .rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('createDFSPWithCSR', () => {
    it('should create a DFSP and generate CSR', async () => {
      const ctx = {};
      const { dfspId, email } = createUniqueDfsp();
      const body = {
      dfspId,
      name: 'Test DFSP',
      email,
      monetaryZoneId: 'USD',
      isProxy: false,
      securityGroup: 'TestGroup',
      fxpCurrencies: ['USD', 'EUR']
      };

      jest.spyOn(PkiService, 'createDFSP').mockResolvedValue({ id: body.dfspId });
      createCSRAndDFSPOutboundEnrollment.mockResolvedValue();

      const result = await PkiService.createDFSPWithCSR(ctx, body);
      expect(result).toEqual({ id: body.dfspId });
    });

    it('should throw an InternalError if CSR generation fails', async () => {
      const ctx = {};
      const { dfspId, email } = createUniqueDfsp();
      const body = {
      dfspId,
      name: 'Test DFSP',
      email,
      monetaryZoneId: 'USD',
      isProxy: false,
      securityGroup: 'TestGroup',
      fxpCurrencies: ['USD', 'EUR']
      };

      jest.spyOn(PkiService, 'createDFSP').mockResolvedValue({ id: body.dfspId });
      createCSRAndDFSPOutboundEnrollment.mockRejectedValue(new Error('CSR Error'));

      await expect(PkiService.createDFSPWithCSR(ctx, body))
      .rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('getDFSPs', () => {
    const dfspRows = [
      { dfsp_id: 'dfsp1', name: 'DFSP 1', monetaryZoneId: 'USD', isProxy: false },
      { dfsp_id: 'dfsp2', name: 'DFSP 2', monetaryZoneId: 'EUR', isProxy: true },
      { dfsp_id: 'dfsp3', name: 'DFSP 3', monetaryZoneId: 'USD', isProxy: false }
    ];

    beforeEach(() => {
      jest.spyOn(DFSPModel, 'findAll').mockResolvedValue(dfspRows);
    });

    it('returns every DFSP to an unrestricted caller', async () => {
      const result = await PkiService.getDFSPs({}, EVERYTHING);
      expect(result.map(r => r.id)).toEqual(['dfsp1', 'dfsp2', 'dfsp3']);
    });

    it('narrows the list to the DFSPs the scope names', async () => {
      const result = await PkiService.getDFSPs({}, restrictedTo(['dfsp1']));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dfsp1');
    });

    it('keeps every DFSP the scope names, and only those', async () => {
      const result = await PkiService.getDFSPs({}, restrictedTo(['dfsp1', 'dfsp3']));
      expect(result.map(r => r.id)).toEqual(['dfsp1', 'dfsp3']);
    });
  });

  describe('validateDfsp', () => {
    it('should validate DFSP existence', async () => {
      const ctx = {};
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(PkiService, 'getDFSPById').mockResolvedValue({ id: dfspId });

      const result = await PkiService.validateDfsp(ctx, dfspId);
      expect(result).toEqual({ id: dfspId });
    });
  });

  describe('getDFSPById', () => {
    it('should return a DFSP by its id', async () => {
      const ctx = {};
      const { dfspId } = createUniqueDfsp();
      const dfspRow = { dfsp_id: dfspId, name: 'Test DFSP', monetaryZoneId: 'USD', isProxy: false };

      jest.spyOn(DFSPModel, 'findByDfspId').mockResolvedValue(dfspRow);

      const result = await PkiService.getDFSPById(ctx, dfspId);
      expect(result).toEqual(PkiService.dfspRowToObject(dfspRow));
    });

    it('should throw NotFoundError if DFSP is not found', async () => {
      const ctx = {};
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(DFSPModel, 'findByDfspId').mockImplementation(() => { throw new NotFoundError(); });

      await expect(PkiService.getDFSPById(ctx, dfspId))
      .rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError if dfspId is invalid', async () => {
      const ctx = {};
      const dfspId = null;

      await expect(PkiService.getDFSPById(ctx, dfspId))
      .rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('updateDFSP', () => {
    it('should update a DFSP', async () => {
      const ctx = {};
      const { dfspId } = createUniqueDfsp();
      const newDfsp = { name: 'Updated DFSP', monetaryZoneId: 'EUR', isProxy: true, securityGroup: 'UpdatedGroup' };

      DFSPModel.update.mockResolvedValue();

      await PkiService.updateDFSP(ctx, dfspId, newDfsp);
      expect(DFSPModel.update).toHaveBeenCalled();
    });

    it('should throw ValidationError if dfspId is invalid', async () => {
      const ctx = {};
      const dfspId = null;
      const newDfsp = { name: 'Updated DFSP', monetaryZoneId: 'EUR', isProxy: true, securityGroup: 'UpdatedGroup' };

      await expect(PkiService.updateDFSP(ctx, dfspId, newDfsp))
        .rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteDFSP', () => {
    it('should delete a DFSP by its id', async () => {
      const ctx = { pkiEngine: { deleteAllDFSPData: jest.fn().mockResolvedValue() } };
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(PkiService, 'validateDfsp').mockResolvedValue();
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(1);
      jest.spyOn(DFSPModel, 'delete').mockResolvedValue();

      await PkiService.deleteDFSP(ctx, dfspId);

      expect(ctx.pkiEngine.deleteAllDFSPData).toHaveBeenCalled();
      expect(DFSPModel.delete).toHaveBeenCalled();
    });
  });

  describe('setDFSPca', () => {
    it('should set DFSP CA certificates', async () => {
      const ctx = {
      pkiEngine: {
        validateCACertificate: jest.fn().mockResolvedValue({ validations: [], validationState: 'VALID' }),
        setDFSPCA: jest.fn().mockResolvedValue()
      }
      };
      const { dfspId } = createUniqueDfsp();
      const body = { rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' };

      jest.spyOn(PkiService, 'validateDfsp').mockResolvedValue();
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(1);

      const result = await PkiService.setDFSPca(ctx, dfspId, body);
      expect(ctx.pkiEngine.setDFSPCA).toHaveBeenCalledWith(1, {"intermediateChain": "intermediate-chain", "rootCertificate": "root-cert", "validationState": "VALID", "validations": []});
      expect(result).toEqual({
      rootCertificate: body.rootCertificate,
      intermediateChain: body.intermediateChain,
      validations: [],
      validationState: 'VALID'
      });
    });
  });

  describe('getDFSPca', () => {
    it('should return DFSP CA certificates', async () => {
      const ctx = {
      pkiEngine: {
        getDFSPCA: jest.fn().mockResolvedValue({ rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' })
      }
      };
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(PkiService, 'validateDfsp').mockResolvedValue();
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(1);

      const result = await PkiService.getDFSPca(ctx, dfspId);
      expect(result).toEqual({ rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' });
    });

    it('should return default values if DFSP CA certificates are not found', async () => {
      const ctx = {
      pkiEngine: {
        getDFSPCA: jest.fn().mockImplementation(() => { throw new NotFoundError(); })
      }
      };
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(PkiService, 'validateDfsp').mockResolvedValue();
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(1);

      const result = await PkiService.getDFSPca(ctx, dfspId);
      expect(result).toEqual({
      rootCertificate: null,
      intermediateChain: null,
      validations: [],
      validationState: 'NOT_AVAILABLE'
      });
    });
  });

  describe('deleteDFSPca', () => {
    it('should delete DFSP CA certificates', async () => {
      const ctx = { pkiEngine: { deleteDFSPCA: jest.fn().mockResolvedValue() } };
      const { dfspId } = createUniqueDfsp();

      jest.spyOn(PkiService, 'validateDfsp').mockResolvedValue();
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(1);

      await PkiService.deleteDFSPca(ctx, dfspId);

      expect(ctx.pkiEngine.deleteDFSPCA).toHaveBeenCalledWith(1);
    });
  });

  describe('getDfspsByMonetaryZones', () => {
    const monetaryZoneId = 'USD';
    const dfspRows = [
      { dfsp_id: 'dfsp1', name: 'DFSP 1', monetaryZoneId: 'USD', isProxy: false },
      { dfsp_id: 'dfsp2', name: 'DFSP 2', monetaryZoneId: 'USD', isProxy: true }
    ];

    beforeEach(() => {
      DFSPModel.getDfspsByMonetaryZones.mockResolvedValue(dfspRows);
    });

    it('returns the zone\'s DFSPs to an unrestricted caller', async () => {
      const result = await PkiService.getDfspsByMonetaryZones({}, monetaryZoneId, EVERYTHING);
      expect(result.map(r => r.id)).toEqual(['dfsp1', 'dfsp2']);
    });

    it('narrows the zone\'s DFSPs to the ones the scope names', async () => {
      const result = await PkiService.getDfspsByMonetaryZones({}, monetaryZoneId, restrictedTo(['dfsp1']));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dfsp1');
    });
  });
});
