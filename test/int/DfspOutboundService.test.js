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

const { setupTestDB, tearDownTestDB } = require("./test-database");

const fs = require("fs");
const path = require("path");
const PkiService = require("../../src/service/PkiService");
const DfspOutboundService = require("../../src/service/DfspOutboundService");
const ROOT_CA = require("./Root_CA.js");
const DFSPModel = require("../../src/models/DFSPModel");
const forge = require("node-forge");
const sinon = require("sinon");
const ValidationCodes = require("../../src/pki_engine/ValidationCodes");
const { createInternalHubCA } = require("../../src/service/HubCAService");
const { createContext, destroyContext } = require("./context");
const { createUniqueDfsp } = require('./test-helpers');

// Sign CSR and return certificate ( what the DFSP would do )
const createCertFromCSR = (csrPem) => {
  const certPath = path.join(__dirname, "resources/modusbox/ca.pem");
  const keyPath = path.join(__dirname, "resources/modusbox/ca-key.pem");

  const caCert = forge.pki.certificateFromPem(fs.readFileSync(certPath));
  const privateKey = forge.pki.privateKeyFromPem(fs.readFileSync(keyPath));
  const csr = forge.pki.certificationRequestFromPem(csrPem);

  const cert = forge.pki.createCertificate();
  cert.serialNumber = "02";

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // subject from CSR
  if (csr.subject?.attributes) {
    cert.setSubject(csr.subject.attributes);
    // issuer from CA
    cert.setIssuer(caCert.subject.attributes);
    const ext = csr.getAttribute({ name: "extensionRequest" })?.extensions;
    if (ext) {
      cert.setExtensions(ext);
    }
  }

  cert.publicKey = csr.publicKey;
  cert.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
};

describe("DfspOutboundService", function () {
  let ctx;
  beforeAll(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe("DfspOutboundService flow", function () {
    let dfspId = null;
    const DFSP_TEST_OUTBOUND = "dfsp.outbound.io";

    beforeAll(async () => {
      await createInternalHubCA(ctx, ROOT_CA);
    }, 10_000);

    beforeEach(async function () {
      const dfsp = createUniqueDfsp();
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach(async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it("should get DFSP outbound enrollments", async () => {
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        dfspId
      );
      expect(Array.isArray(enrollments)).toBe(true);
    });

    it("should get DFSP outbound enrollments filtered by state", async () => {
      const state = "CSR_LOADED";
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        dfspId,
        state
      );
      expect(Array.isArray(enrollments)).toBe(true);
      enrollments.forEach((enrollment) => {
        expect(enrollment.state).toBe(state);
      });
    });
    it("should create an OutboundEnrollment and its CSR and get a VALIDATED when validating the signed certificate", async () => {
      const body = {
        subject: {
          CN: "dfspendpoint1.test.modusbox.com",
          E: "connection-manager@modusbox.com",
          O: "Modusbox",
          OU: "PKI",
          ST: "XX",
          C: "YY",
          L: "ZZ",
        },
        extensions: {
          subjectAltName: {
            dns: [
              "dfspendpoint1.test.modusbox.com",
              "dfspendpoint2.test.modusbox.com"
            ],
            ips: ["163.10.5.1", "163.10.5.2"],
          },
        },
      };
      const enrollmentResult =
        await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          dfspId,
          body
        );
      expect(enrollmentResult).toHaveProperty("id");
      expect(enrollmentResult.id).not.toBeNull();
      const enrollmentId = enrollmentResult.id;

      const newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        dfspId,
        enrollmentId
      );
      expect(newEnrollment.id).toBe(enrollmentId);
      expect(newEnrollment.state).toBe("CSR_LOADED");
      expect(newEnrollment).not.toHaveProperty("key");

      const newCert = createCertFromCSR(newEnrollment.csr);

      // Now push the certificate to the Connection-Manager
      const certAddedEnrollment =
        await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId,
          { certificate: newCert }
        );
      // Validate its state
      expect(certAddedEnrollment.id).toBe(enrollmentId);
      expect(certAddedEnrollment.certificate).toBe(newCert);
      expect(certAddedEnrollment.state).toBe("CERT_SIGNED");

      // Validate its state again
      const afterCertAddedEnrollment =
        await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          dfspId,
          enrollmentId
        );
      expect(afterCertAddedEnrollment.id).toBe(enrollmentId);
      expect(afterCertAddedEnrollment.certificate).toBe(newCert);
      expect(afterCertAddedEnrollment.state).toBe("CERT_SIGNED");

      // Now ask the TSP to validate the cert
      const afterCertValidatedEnrollment =
        await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId
        );

      // Since I didn't upload the dfsp ca, it can't validate the cert
      expect(afterCertValidatedEnrollment.validationState).toBe("VALID");
      const validationSignedByDFSPCA =
        afterCertValidatedEnrollment.validations.find(
          (element) =>
        element.validationCode ===
        ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
        );
      expect(validationSignedByDFSPCA.result).toBe("NOT_AVAILABLE");

      // let's upload it
      await PkiService.setDFSPca(ctx, dfspId, {
        rootCertificate: fs
          .readFileSync(path.join(__dirname, "resources/modusbox/ca.pem"))
          .toString(),
      });

      // Now ask the TSP to validate the cert, again
      const afterCertValidatedEnrollmentWithCA =
        await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId
        );

      // Should be ok now
      expect(afterCertValidatedEnrollmentWithCA.validationState).toBe(
        "VALID"
      );

      // 'VALID' key and signing 'VALID' should give a valid state
      expect(afterCertValidatedEnrollmentWithCA.state).toBe(
        "CERT_SIGNED"
      );
    }, 60000);
  }, 80000);
}, 90000);

describe("getDFSPOutboundEnrollments", () => {
  let ctx;
  let validateDfspStub;
  let findIdByDfspIdStub;
  let getDFSPOutboundEnrollmentsStub;

  beforeEach(() => {
    ctx = { pkiEngine: { getDFSPOutboundEnrollments: sinon.stub() } };
    validateDfspStub = sinon.stub(PkiService, "validateDfsp").resolves();
    findIdByDfspIdStub = sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    getDFSPOutboundEnrollmentsStub = ctx.pkiEngine.getDFSPOutboundEnrollments;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return filtered enrollments when state is provided", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId",
      "active"
    );
    expect(result).toEqual([{ state: "active" }]);
  });

  it("should return all enrollments when state is not provided", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId"
    );
    expect(result).toEqual([{ state: "active" }, { state: "inactive" }]);
  });

  it("should handle different state values", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId",
      "inactive"
    );
    expect(result).toEqual([{ state: "inactive" }]);
  });

  it("should handle no enrollments", async () => {
    getDFSPOutboundEnrollmentsStub.resolves([]);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId"
    );
    expect(result).toEqual([]);
  });
});

describe("createCSRAndDFSPOutboundEnrollment", () => {
  let ctx;
  let validateDfspStub;
  let createCSRStub;
  let getCSRInfoStub;
  let setDFSPOutboundEnrollmentStub;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
    validateDfspStub = sinon.stub(PkiService, "validateDfsp").resolves();
    createCSRStub = ctx.pkiEngine.createCSR;
    getCSRInfoStub = ctx.pkiEngine.getCSRInfo;
    setDFSPOutboundEnrollmentStub = ctx.pkiEngine.setDFSPOutboundEnrollment;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully create CSR and enrollment", async () => {
    const mockCSR = "mock-csr";
    const mockPrivateKey = "mock-private-key";
    const mockCSRInfo = { subject: "test" };

    createCSRStub.resolves({ csr: mockCSR, privateKey: mockPrivateKey });
    getCSRInfoStub.returns(mockCSRInfo);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    const result = await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
      ctx,
      "testDfspId"
    );

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("csr", mockCSR);
    expect(result).toHaveProperty("csrInfo", mockCSRInfo);
    expect(result).toHaveProperty("state", "CSR_LOADED");
    expect(result).not.toHaveProperty("key");
  });

  it("should throw error when validation fails", async () => {
    validateDfspStub.rejects(new Error("Validation failed"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).rejects.toThrow("Validation failed");
  });
});

describe("getDFSPOutboundEnrollment", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully retrieve enrollment", async () => {
    const mockEnrollment = {
      id: "test-id",
      state: "CSR_LOADED",
      key: "private-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const result = await DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "test-id"
    );

    expect(result).not.toHaveProperty("key");
    expect(result).toHaveProperty("id", "test-id");
    expect(result).toHaveProperty("state", "CSR_LOADED");
  });

  it("should throw error for invalid enrollment ID", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.rejects(
      new Error("Enrollment not found")
    );

    await expect(
      DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "invalid-id"
      )
    ).rejects.toThrow("Enrollment not found");
  });
});

describe("validateDFSPOutboundEnrollmentCertificate", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully validate certificate", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).toHaveProperty("validationState", "VALID");
    expect(result.validations).toEqual(mockValidation.validations);
  });

  it.skip("should handle missing DFSP CA", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves(null);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).toHaveProperty("validationState");
  });
});

describe("addDFSPOutboundEnrollmentCertificate", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getCertInfo: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully add and validate certificate", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );
      expect(result).toHaveProperty("certificate", mockCertificate);
      expect(result).toHaveProperty("certInfo", mockCertInfo);
      expect(result).toHaveProperty("state", "CERT_SIGNED");
      expect(result).toHaveProperty("validationState", "VALID");
      expect(result).not.toHaveProperty("key");
  });

  it("should throw ValidationError for invalid certificate content", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.getCertInfo.throws(new Error("Invalid certificate"));

    await expect(
      DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
      ctx,
      "testDfspId",
      "test-id",
      { certificate: "invalid-cert" }
      )
    ).rejects.toThrow("Could not parse the Certificate content");
  });

  it("should handle case when DFSP CA is not available", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "NOT_AVAILABLE" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves(null);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result.validationState).toEqual("VALID");
    expect(result.state).toEqual("CERT_SIGNED");
  });

  it("should validate enrollment data integrity after certificate addition", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const originalEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
      someExistingProp: "existing-value",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(originalEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result).toMatchObject({
      someExistingProp: "existing-value",
      certificate: mockCertificate,
      state: "CERT_SIGNED",
    });
    expect(result).not.toHaveProperty("key");
  });

  it("should handle validation failure cases", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "INVALID" }],
      validationState: "INVALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result.validationState).toEqual("INVALID");
    expect(result.state).toEqual("CERT_SIGNED");
    expect(result.validations[0].result).toEqual("INVALID");
  });
});

// Integration test scenarios for DFSP outbound service certificate validation
describe("DfspOutboundService certificate validation scenarios", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle missing certificate when validating enrollment", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
      state: "CSR_LOADED",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "MISSING_CERT", result: "INVALID" }],
      validationState: "INVALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).toHaveProperty("validationState", "INVALID");
    expect(result).not.toHaveProperty("certificate");
  });

  it("should validate enrollment with expired certificate", async () => {
    const expiredCert = "expired-certificate";
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: expiredCert,
      key: "test-key",
      state: "CERT_SIGNED",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "CERT_EXPIRED", result: "INVALID" }],
      validationState: "INVALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result.validationState).toEqual("INVALID");
    expect(result.validations[0].code).toEqual("CERT_EXPIRED");
  });

  it("should handle concurrent validation requests", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    });

    const validationPromises = [
      DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      ),
      DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      )
    ];

    const results = await Promise.all(validationPromises);
    expect(results[0].validationState).toEqual("VALID");
    expect(results[1].validationState).toEqual("VALID");
  });
});

describe("DfspOutboundService error handling", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle invalid DFSP ID", async () => {
    sinon
      .stub(PkiService, "validateDfsp")
      .rejects(new Error("Invalid DFSP ID"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
      ctx,
      "invalid-dfsp-id"
      )
    ).rejects.toThrow("Invalid DFSP ID");
  });

  it("should handle CSR creation failure", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.createCSR.rejects(new Error("CSR creation failed"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).rejects.toThrow("CSR creation failed");
  });

  it("should handle enrollment not found error", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.rejects(
      new Error("Enrollment not found")
    );
    await expect(
      DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "nonexistent-id"
      )
    ).rejects.toThrow("Enrollment not found");
  });

  it("should handle database errors when setting enrollment", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.createCSR.resolves({
      csr: "test-csr",
      privateKey: "test-key",
    });
    ctx.pkiEngine.getCSRInfo.returns({ subject: "test-subject" });
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.setDFSPOutboundEnrollment.rejects(
      new Error("Database error")
    );

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).rejects.toThrow("Database error");
  });
});

describe("DfspOutboundService data integrity", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollments: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it.skip("should maintain enrollment data consistency across operations", async () => {
    const originalEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
      state: "CERT_SIGNED",
      metadata: { created: "2023-01-01" },
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(originalEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).toMatchObject({
      id: originalEnrollment.id,
      csr: originalEnrollment.csr,
      certificate: originalEnrollment.certificate,
      state: originalEnrollment.state,
    });
    expect(result.metadata).toEqual(originalEnrollment.metadata);
  });

  it.skip("should properly filter sensitive data across all operations", async () => {
    const enrollments = [
      { id: "1", key: "secret1", state: "active", sensitiveData: "private1" },
      { id: "2", key: "secret2", state: "inactive", sensitiveData: "private2" }
    ];

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollments.resolves(enrollments);

    const results = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "testDfspId"
    );

    results.forEach((enrollment) => {
      expect(enrollment).not.toHaveProperty("key");
      expect(enrollment).not.toHaveProperty("sensitiveData");
    });
  });

  it.skip("should handle concurrent enrollment creations efficiently", async () => {
    const numberOfConcurrentRequests = 50;
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.createCSR.resolves({
      csr: "test-csr",
      privateKey: "test-key",
    });
    ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });
    ctx.pkiEngine.setDFSPOutboundEnrollment.resolves();

    const startTime = process.hrtime();

    const requests = Array(numberOfConcurrentRequests)
      .fill()
      .map(() =>
        DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId"
        )
      );

    const results = await Promise.all(requests);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000;
    expect(results).toHaveLength(numberOfConcurrentRequests);
    expect(executionTime).toBeLessThan(2000); // Should handle 50 requests within 2 seconds
  });

  it("should maintain performance with large certificate data", async () => {
    const largeCertificate = "x".repeat(10000); // 10KB certificate
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: largeCertificate,
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const startTime = process.hrtime();

    const result = await DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "test-id"
    );

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000;

    expect(result.certificate).toHaveLength(10000);
    expect(executionTime).toBeLessThan(100); // Should complete within 100ms
  });

  describe("Memory usage tests", () => {
    it("should handle memory efficiently with large datasets", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create large dataset
      const largeEnrollmentSet = Array(10000)
        .fill()
        .map((_, i) => ({
          id: `id-${i}`,
          state: "active",
          key: "x".repeat(1000), // 1KB key
          certificate: "x".repeat(1000), // 1KB certificate
        }));

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollments.resolves(largeEnrollmentSet);

      const results = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        "testDfspId"
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
      expect(results).toHaveLength(10000);
      expect(memoryUsed).toBeLessThan(100); // Should use less than 100MB of additional memory
    });
  });

  describe("Load testing scenarios", () => {
    it("should handle rapid sequential requests", async () => {
      const numberOfRequests = 100;
      const mockEnrollment = {
        id: "test-id",
        csr: "test-csr",
        key: "test-key",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

      const startTime = process.hrtime();

      for (let i = 0; i < numberOfRequests; i++) {
        await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        );
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;
      const averageRequestTime = executionTime / numberOfRequests;

      expect(averageRequestTime).toBeLessThan(10); // Average request should complete within 10ms

    });

    it.skip("should handle multiple operations in parallel", async () => {
      const operations = [
        DfspOutboundService.getDFSPOutboundEnrollments(ctx, "testDfspId"),
        DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        ),
        DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId"
        ),
        DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          "testDfspId",
          "test-id"
        )
      ];

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollments.resolves([]);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves({ id: "test-id" });
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });

      const startTime = process.hrtime();

      await Promise.all(operations);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(executionTime).toBeLessThan(500); // Should complete all operations within 500ms
    });
  });
});

describe("DfspOutboundService extended scenarios", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        getDFSPOutboundEnrollments: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        getCertInfo: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("Recovery and resilience tests", () => {
    it.skip("should retry failed operations with exponential backoff", async () => {
      const mockEnrollment = { id: "test-id", state: "CSR_LOADED" };
      let attempts = 0;

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

      ctx.pkiEngine.getDFSPOutboundEnrollment
        .onFirstCall()
        .rejects(new Error("Network error"))
        .onSecondCall()
        .rejects(new Error("Network error"))
        .onThirdCall()
        .resolves(mockEnrollment);

      const startTime = process.hrtime();

      const result = await DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        "testDfspId",
        "test-id"
      );

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(result).toEqual(mockEnrollment);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second including retries

    });

    it("should handle concurrent certificate validations with rate limiting", async () => {
      const numberOfValidations = 20;
      const mockEnrollment = {
        id: "test-id",
        certificate: "test-cert",
        state: "CERT_SIGNED",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
      ctx.pkiEngine.validateOutboundEnrollment.returns({
        validations: [{ code: "TEST", result: "OK" }],
        validationState: "VALID",
      });

      const startTime = process.hrtime();

      const validations = Array(numberOfValidations)
        .fill()
        .map(() =>
          DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
            ctx,
            "testDfspId",
            "test-id"
          )
        );

      const results = await Promise.all(validations);

      const [seconds] = process.hrtime(startTime);

      results.forEach((result) => {
        expect(result.validationState).toEqual("VALID");
      });
      expect(seconds).toBeLessThan(2); // Should complete all validations within 2 seconds
    });
  });

  describe("Edge case handling", () => {
    it("should handle extremely large CSR generation requests", async () => {
      const largeSubject = {
        CN: "a".repeat(1000),
        O: "b".repeat(1000),
        OU: "c".repeat(1000),
        C: "US",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: largeSubject });

      const result =
        await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          { subject: largeSubject }
        );

      expect(result).toHaveProperty("state", "CSR_LOADED");
      expect(result.csrInfo.subject).toEqual(largeSubject);
    });

    it("should handle enrollment state transitions correctly", async () => {
      const states = ["CSR_LOADED", "CERT_SIGNED", "VALID", "INVALID"];
      const mockEnrollment = { id: "test-id", key: "test-key" };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

      for (const state of states) {
        mockEnrollment.state = state;
        const result = await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        );
        expect(result.state).toEqual(state);
      }
    });
  });

  describe("Bulk operation handling", () => {
    it("should process multiple enrollment creations in chunks", async () => {
      const numberOfEnrollments = 100;
      const chunkSize = 10;

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });

      const startTime = process.hrtime();

      const enrollments = [];
      for (let i = 0; i < numberOfEnrollments; i += chunkSize) {
        const chunk = Array(Math.min(chunkSize, numberOfEnrollments - i))
          .fill()
          .map(() =>
            DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
              ctx,
              "testDfspId"
            )
          );
        enrollments.push(...(await Promise.all(chunk)));
      }

      const [seconds] = process.hrtime(startTime);

      expect(enrollments).toHaveLength(numberOfEnrollments);
      expect(seconds).toBeLessThan(10); // Should process all chunks within 10 seconds
    });

    it.skip("should handle mixed operation types in sequence", async () => {
      const mockEnrollment = {
        id: "test-id",
        csr: "test-csr",
        certificate: "test-cert",
        key: "test-key",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
      ctx.pkiEngine.validateOutboundEnrollment.returns({
        validations: [{ code: "TEST", result: "OK" }],
        validationState: "VALID",
      });

      const operations = [
        () =>
          DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
            ctx,
            "testDfspId"
          ),
        () =>
          DfspOutboundService.getDFSPOutboundEnrollment(
            ctx,
            "testDfspId",
            "test-id"
          ),
        () =>
          DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
            ctx,
            "testDfspId",
            "test-id"
          ),
        () => DfspOutboundService.getDFSPOutboundEnrollments(ctx, "testDfspId")
      ];

      const results = [];
      for (const operation of operations) {
        results.push(await operation());
      }

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).not.toHaveProperty("key");
      });
    });
  });
});
