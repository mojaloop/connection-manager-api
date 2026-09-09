const mockKnex = {
  table: jest.fn()
};
jest.mock('../../../src/db/database', () => ({
  knex: mockKnex,
  executeWithErrorCount: jest.fn((queryFn) => queryFn(mockKnex))
}));
jest.mock('../../../src/models/DFSPModel');

const DFSPEndpointItemModel = require('../../../src/models/DFSPEndpointItemModel');
const DFSPModel = require('../../../src/models/DFSPModel');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');
const knex = require('../../../src/db/database').knex;

describe('DFSPEndpointItemModel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return the item when found', async () => {
      const id = 1;
      const mockRow = { id: 1, value: 'test' };
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([mockRow])
        })
      });

      const result = await DFSPEndpointItemModel.findById(id);
      expect(result).toEqual(mockRow);
    });

    it('should return the item when found with id in array', async () => {
      const id = [1];
      const mockRow = { id: 1, value: 'test' };
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([mockRow])
        })
      });

      const result = await DFSPEndpointItemModel.findById(id);
      expect(result).toEqual(mockRow);
    });

    it('should throw NotFoundError when item is not found', async () => {
      const id = 1;
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([])
        })
      });

      await expect(DFSPEndpointItemModel.findById(id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw InternalError when multiple items are found', async () => {
      const id = 1;
      const mockRows = [{ id: 1, value: 'test' }, { id: 1, value: 'test2' }];
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockRows)
        })
      });

      await expect(DFSPEndpointItemModel.findById(id)).rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('findObjectById', () => {
    it('should return the parsed object when found', async () => {
      const id = 1;
      const mockRow = { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 };
      const mockDfsp = { dfsp_id: 1 };
      jest.spyOn(DFSPEndpointItemModel, 'findById').mockResolvedValue(mockRow);
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectById(id);
      expect(result).toEqual({ id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 });
    });
  });

  describe('findObjectAll', () => {
    it('should return all parsed objects for a given dfspId', async () => {
      const dfspId = 'dfsp1';
      const mockDfspId = 1;
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockRows)
        })
      });
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectAll(dfspId);
      expect(result).toEqual([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('create', () => {
    it('should create a new endpoint item', async () => {
      const values = {
        state: 'ACTIVE',
        type: 'IP',
        value: JSON.stringify({ ip: '127.0.0.1' }),
        dfspId: 'dfsp1',
        direction: 'INBOUND'
      };
      const mockDfspId = 1;
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);
      knex.table.mockReturnValue({
        insert: jest.fn().mockResolvedValue([1])
      });

      const result = await DFSPEndpointItemModel.create(values);
      expect(result).toEqual([1]);
    });
  });

  describe('delete', () => {
    it('should delete an endpoint item by id', async () => {
      const id = 1;
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(1)
        })
      });

      const result = await DFSPEndpointItemModel.delete(id);
      expect(result).toBe(1);
    });
  });

  describe('findAllEnvState', () => {
    it('should return all environment items with a specific state', async () => {
      const state = 'ACTIVE';
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      knex.table.mockReturnValue({
        join: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            modify: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockRows)
            })
          })
        })
      });
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findAllEnvState(state);
      expect(result).toEqual([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('findObjectByDirectionType', () => {
    it('should return all parsed objects for a given direction and type', async () => {
      const direction = 'INBOUND';
      const type = 'IP';
      const dfspId = 'dfsp1';
      const mockDfspId = 1;
      const mockRows = [
      { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
      { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);

      const whereMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockResolvedValue(mockRows);
      knex.table.mockReturnValue({
      where: whereMock,
      select: selectMock
      });
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectByDirectionType(direction, type, dfspId);
      expect(knex.table).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalled();
      expect(result).toEqual([
      { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
      { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('findConfirmedByDirectionType', () => {
    it('should return all confirmed parsed objects for a given direction and type', async () => {
      const direction = 'INBOUND';
      const type = 'IP';
      const mockRows = [
      { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
      { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };

      const whereMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockResolvedValue(mockRows);
      knex.table.mockReturnValue({
      where: whereMock,
      select: selectMock
      });
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findConfirmedByDirectionType(direction, type);
      expect(knex.table).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalled();
      expect(result).toEqual([
      { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
      { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('update', () => {
    it('should update an endpoint item by id and dfspId', async () => {
      const dfspId = 'dfsp1';
      const id = 1;
      const endpointItem = { state: 'INACTIVE' };
      const mockDfspId = 1;
      const mockRow = { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 };
      const mockDfsp = { dfsp_id: 1 };

      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);

      const whereMock = jest.fn().mockReturnThis();
      const updateMock = jest.fn().mockResolvedValue(1);
      knex.table.mockReturnValue({
        where: whereMock,
        update: updateMock
      });

      jest.spyOn(DFSPEndpointItemModel, 'findObjectById').mockResolvedValue(mockRow);
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.update(dfspId, id, endpointItem);
      expect(DFSPModel.findIdByDfspId).toHaveBeenCalledWith(dfspId);
      expect(knex.table).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith(endpointItem);
      expect(result).toEqual({ id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 });
    });

    it('should throw error when updating an endpoint item by id and dfspId', async () => {
      const dfspId = 'dfsp10000';
      const id = 'xxx';
      const endpointItem = { state: 'INACTIVE' };
      const mockDfspId = 1;
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);

      // Mock knex.table().where().update() to resolve to 1
      const whereMock = jest.fn().mockReturnThis();
      const updateMock = jest.fn().mockResolvedValue(1);
      knex.table.mockReturnValue({
      where: whereMock,
      update: updateMock
      });

      // Mock findObjectById to throw InternalError
      jest.spyOn(DFSPEndpointItemModel, 'findObjectById').mockImplementation(() => {
      throw new InternalError('Update failed');
      });

      await expect(DFSPEndpointItemModel.update(dfspId, id, endpointItem)).rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('findAllDfspState', () => {
    it('should return all DFSP items with a specific state', async () => {
      const dfspId = 'dfsp1';
      const state = 'ACTIVE';
      const mockDfspId = 1;
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockRows)
          })
        })
      });
      DFSPModel.findByRawId.mockResolvedValue(mockDfsp);

      const result = await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
      expect(result).toEqual([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });

    it('should return an empty array if no items are found', async () => {
      const dfspId = 'dfsp1';
      const state = 'ACTIVE';
      const mockDfspId = 1;
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
      expect(result).toEqual([]);
    });

    it('should throw an error if DFSPModel.findIdByDfspId fails', async () => {
      const dfspId = 'dfsp1';
      const state = 'ACTIVE';
      DFSPModel.findIdByDfspId.mockRejectedValue(new Error('DFSPModel error'));

      await expect(DFSPEndpointItemModel.findAllDfspState(dfspId, state)).rejects.toThrow('DFSPModel error');
    });

    it('should throw an error if knex.table fails', async () => {
      const dfspId = 'dfsp1';
      const state = 'ACTIVE';
      const mockDfspId = 1;
      DFSPModel.findIdByDfspId.mockResolvedValue(mockDfspId);
      knex.table.mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockRejectedValue(new Error('knex error'))
          })
        })
      });

      await expect(DFSPEndpointItemModel.findAllDfspState(dfspId, state)).rejects.toThrow('knex error');
    });
  });
});
