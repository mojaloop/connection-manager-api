const DFSPModel = require("../../../src/models/DFSPModel");
const NotFoundError = require("../../../src/errors/NotFoundError");
const InternalError = require("../../../src/errors/InternalError");
const { knex } = require("../../../src/db/database");

jest.mock("../../../src/db/database", () => {
  const mockKnex = {
    table: jest.fn(() => ({
      where: jest.fn(() => ({
        update: jest.fn(),
        del: jest.fn(),
        select: jest.fn(),
      })),
      join: jest.fn(() => ({
        where: jest.fn(() => ({
          select: jest.fn(),
        })),
      })),
      insert: jest.fn(),
    }))
  };
  return {
    knex: mockKnex,
    executeWithErrorCount: jest.fn((queryFn) => queryFn(mockKnex))
  };
});

describe("DFSPModel", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks && jest.restoreAllMocks();
  });

  describe("findByRawId", () => {
    it("should throw NotFoundError for non-existent raw id", async () => {
      knex.table.mockReturnValue({
        where: () => ({
          select: async () => []
        })
      });
      await expect(DFSPModel.findByRawId(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getDfspsByMonetaryZones", () => {
    it("should throw NotFoundError when no DFSPs exist for monetary zone", async () => {
      knex.table.mockReturnValue({
        where: () => ({
          select: async () => []
        })
      });
      await expect(DFSPModel.getDfspsByMonetaryZones("EUR")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should throw NotFoundError when updating non-existent DFSP", async () => {
      knex.table.mockReturnValue({
        where: () => ({
          update: async () => 0
        })
      });
      await expect(DFSPModel.update("nonexistent", { name: "New Name" })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should return updated DFSP object when update is successful", async () => {
      const dfspId = "existent";
      const newDfsp = { name: "Updated Name" };
      const dfsp = { dfsp_id: dfspId, name: "Updated Name", monetaryZoneId: "USD", isProxy: false };

      knex.table.mockReturnValue({
        where: () => ({
          update: async () => 1
        })
      });

      jest.spyOn(DFSPModel, "findByDfspId").mockResolvedValue(dfsp);

      const result = await DFSPModel.update(dfspId, newDfsp);
      expect(result).toEqual({
        dfspId: dfsp.dfsp_id,
        name: dfsp.name,
        monetaryZoneId: dfsp.monetaryZoneId,
        isProxy: dfsp.isProxy
      });
    });

    it("should throw InternalError if update affects more than one row", async () => {
      knex.table.mockReturnValue({
        where: () => ({
          update: async () => 2
        })
      });

      await expect(DFSPModel.update("existent", { name: "New Name" })).rejects.toBeInstanceOf(InternalError);
    });
  });

  describe("delete by dfspId", () => {
    it("should not throw error when deleting non-existent dfspId", async () => {
      knex.table.mockReturnValue({
        where: () => ({
          del: async () => 0
        })
      });
      const result = await DFSPModel.delete("nonexistent");
      expect(result).toBe(0);
    });
  });

  describe("getFxpSupportedCurrencies", () => {
    it("should throw NotFoundError if select throws NotFoundError", async () => {
      const dfspId = "someDfspId";
      knex.table.mockReturnValue({
        join: () => ({
          where: () => ({
            select: async () => { throw new NotFoundError("No currencies found"); }
          })
        })
      });

      await expect(DFSPModel.getFxpSupportedCurrencies(dfspId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should return monetaryZoneIds if currencies are found", async () => {
      const dfspId = "someDfspId";
      const monetaryZoneIds = [{monetaryZoneId: "USD"},  {monetaryZoneId: "EUR"}];
      knex.table.mockReturnValue({
        join: () => ({
          where: () => ({
            select: async () => monetaryZoneIds
          })
        }),
        where: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
        insert: jest.fn()
      });

      const result = await DFSPModel.getFxpSupportedCurrencies(dfspId);
      expect(result).toEqual(["USD", "EUR"]);
    });
  });

  describe("createFxpSupportedCurrencies", () => {
    it("should insert monetaryZoneIds for a valid dfsp_id", async () => {
      const dfsp_id = "validDfspId";
      const monetaryZoneIds = ["USD", "EUR"];
      const dfspId = 1;

      jest.spyOn(DFSPModel, "findIdByDfspId").mockResolvedValue(dfspId);
      const insertMock = jest.fn().mockResolvedValue();
      // Ensure all methods used in the tested function are present in the mock
      knex.table.mockReturnValue({
        insert: insertMock,
        where: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
        join: jest.fn()
      });

      await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        monetaryZoneIds.map((monetaryZoneId) => ({ dfspId, monetaryZoneId }))
      );

      DFSPModel.findIdByDfspId.mockRestore();
    });

    it("should not insert anything if monetaryZoneIds is empty", async () => {
      const dfsp_id = "validDfspId";
      const monetaryZoneIds = [];

      const insertMock = jest.fn();
      knex.table.mockReturnValue({ insert: insertMock });

      await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);

      expect(insertMock).not.toHaveBeenCalled();
    });

    it("should throw an error if findIdByDfspId fails", async () => {
      const dfsp_id = "invalidDfspId";
      const monetaryZoneIds = ["USD", "EUR"];

      jest.spyOn(DFSPModel, "findIdByDfspId").mockImplementation(() => {
        throw new NotFoundError(`dfsp with dfsp_id = ${dfsp_id}`);
      });
      await expect(
        DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds)
      ).rejects.toBeInstanceOf(NotFoundError);

      DFSPModel.findIdByDfspId.mockRestore();
    });
  });
});
