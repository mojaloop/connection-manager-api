/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

const util = require('util');
const vault = require('node-vault');
const forge = require('node-forge');
const tls = require('tls');
const Joi = require('joi');
const moment = require('moment');
const ValidationError = require('../errors/ValidationError');
const { logger } = require('../log/logger');

const PKIEngine = require('./PKIEngine');
const Validation = require('./Validation');
const ValidationCodes = require('./ValidationCodes');
const CAType = require('../models/CAType');
const InvalidEntityError = require('../errors/InvalidEntityError');
const NotFoundError = require('../errors/NotFoundError');
const { vaultPaths } = require('../constants/Constants');

const VALID_SIGNED = 'VALID(SIGNED)';
const VALID_SELF_SIGNED = 'VALID(SELF_SIGNED)';
const INVALID = 'INVALID';

class VaultPKIEngine extends PKIEngine {
  constructor ({
    endpoint,
    mounts,
    auth,
    pkiServerRole,
    pkiClientRole,
    signExpiryHours,
    keyLength,
    keyAlgorithm
  }) {
    super({ keyLength });
    this.auth = auth;
    this.endpoint = endpoint;
    this.vault = vault({ endpoint });
    this.pkiServerRole = pkiServerRole;
    this.pkiClientRole = pkiClientRole;
    this.mounts = mounts;
    this.signExpiryHours = signExpiryHours;
    this.reconnectTimer = null;
    this.keyLength = keyLength;
    this.keyAlgorithm = keyAlgorithm;

    this.trustedCaStore = forge.pki.createCaStore(tls.rootCertificates.filter(cert => {
      try { forge.pki.certificateFromPem(cert); } catch { return false; } return true;
    }));
  }

  async connect () {
    let creds;

    clearTimeout(this.reconnectTimer);

    if (this.auth.appRole) {
      creds = await this.vault.approleLogin({
        role_id: this.auth.appRole.roleId,
        secret_id: this.auth.appRole.roleSecretId,
      });
    } else if (this.auth.k8s) {
      creds = await this.vault.kubernetesLogin({
        mount_point: this.auth.k8s.mountPoint,
        role: this.auth.k8s.role,
        jwt: this.auth.k8s.token,
      });
    } else {
      throw new Error('Unsupported auth method');
    }
    this.client = vault({
      endpoint: this.endpoint,
      token: creds.auth.client_token,
    });

    const tokenRefreshMs = (creds.auth.lease_duration - 10) * 1000;
    const MAX_TIMEOUT = 2147483647;
    const safeTimeout = Math.min(tokenRefreshMs, MAX_TIMEOUT);
    this.reconnectTimer = setTimeout(this.connect.bind(this), safeTimeout);
  }

  disconnect () {
    clearTimeout(this.reconnectTimer);
  }

  setSecret (key, value) {
    const path = `${this.mounts.kv}/${key}`;
    return this.client.write(path, value);
  }

  validateId (id, name) {
    if (isNaN(id)) throw new Error(`${name} is not a number`);
  }

  async getSecret (key, defaultValue = null) {
    const path = `${this.mounts.kv}/${key}`;
    try {
      const { data } = await this.client.read(path);
      return data;
    } catch (e) {
      if (e.response && e.response.statusCode === 404) {
        if (defaultValue) {
          return defaultValue;
        }
        throw new NotFoundError();
      }
      throw e;
    }
  }

  async listSecrets (key) {
    const path = `${this.mounts.kv}/${key}`;
    try {
      const { data: { keys } } = await this.client.list(path);
      return keys;
    } catch (e) {
      if (e.response && e.response.statusCode === 404) {
        return [];
      }
      throw e;
    }
  }

  async deleteSecret (key) {
    const path = `${this.mounts.kv}/${key}`;
    await this.client.delete(path);
  }

  async deleteAllDFSPData (dfspId) {
    return Promise.all([
      this.deleteAllDFSPOutboundEnrollments(dfspId),
      this.deleteAllDFSPInboundEnrollments(dfspId),
      this.deleteDFSPCA(dfspId),
      this.deleteDFSPJWSCerts(dfspId),
      this.deleteDFSPServerCerts(dfspId)
    ]);
  }

  // region DFSP Outbound Enrollment
  async setDFSPOutboundEnrollment (dfspId, enId, value) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.setSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`, value);
  }

  async getDFSPOutboundEnrollment (dfspId, enId) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.getSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteDFSPOutboundEnrollment (dfspId, enId) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.deleteSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteAllDFSPOutboundEnrollments (dfspId) {
    this.validateId(dfspId, 'dfspId');
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.deleteDFSPOutboundEnrollment(dfspId, enId)));
  }

  async getDFSPOutboundEnrollments (dfspId) {
    this.validateId(dfspId, 'dfspId');
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.getDFSPOutboundEnrollment(dfspId, enId)));
  }
  // endregion

  // region DFSP Inbound Enrollment
  async setDFSPInboundEnrollment (dfspId, enId, value) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.setSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`, value);
  }

  async getDFSPInboundEnrollments (dfspId) {
    this.validateId(dfspId, 'dfspId');
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.getDFSPInboundEnrollment(dfspId, enId)));
  }

  async getDFSPInboundEnrollment (dfspId, enId) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.getSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteDFSPInboundEnrollment (dfspId, enId) {
    this.validateId(dfspId, 'dfspId');
    this.validateId(enId, 'enId');
    return this.deleteSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteAllDFSPInboundEnrollments (dfspId) {
    this.validateId(dfspId, 'dfspId');
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.deleteDFSPInboundEnrollment(dfspId, enId)));
  }
  // endregion

  // region DFSP CA
  async setDFSPCA (dfspId, value) {
    this.validateId(dfspId, 'dfspId');
    return this.setSecret(`${vaultPaths.DFSP_CA}/${dfspId}`, value);
  }

  async getDFSPCA (dfspId) {
    this.validateId(dfspId, 'dfspId');
    return this.getSecret(`${vaultPaths.DFSP_CA}/${dfspId}`);
  }

  async deleteDFSPCA (dfspId) {
    this.validateId(dfspId, 'dfspId');
    return this.deleteSecret(`${vaultPaths.DFSP_CA}/${dfspId}`);
  }
  // endregion

  // region DFSP JWS
  async setDFSPJWSCerts (dfspId, value) {
    return this.setSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`, value);
  }

  async setDFSPExternalJWSCerts (dfspId, value) {
    return this.setSecret(`${vaultPaths.EXTERNAL_JWS_CERTS}/${dfspId}`, value);
  }

  async getDFSPJWSCerts (dfspId) {
    return this.getSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`);
  }

  async getDFSPExternalJWSCerts (dfspId) {
    return this.getSecret(`${vaultPaths.EXTERNAL_JWS_CERTS}/${dfspId}`);
  }

  async getAllDFSPJWSCerts () {
    const secrets = await this.listSecrets(vaultPaths.JWS_CERTS);
    const externalSecrets = await this.listSecrets(vaultPaths.EXTERNAL_JWS_CERTS);
    const nativeDfspJWSCerts = Promise.all(secrets.map(dfspId => this.getDFSPJWSCerts(dfspId)));
    const externalDfspJWSCerts = Promise.all(externalSecrets.map(dfspId => this.getDFSPExternalJWSCerts(dfspId)));
    return [...(await nativeDfspJWSCerts), ...(await externalDfspJWSCerts)];
  }

  async deleteDFSPJWSCerts (dfspId) {
    return this.deleteSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`);
  }
  // endregion

  // region Hub Server Cert
  async setHubServerCert (value) {
    return this.setSecret(vaultPaths.HUB_SERVER_CERT, value);
  }

  async getHubServerCert () {
    return this.getSecret(vaultPaths.HUB_SERVER_CERT);
  }

  async deleteHubServerCert () {
    return this.deleteSecret(vaultPaths.HUB_SERVER_CERT);
  }

  async setHubCACertDetails (value) {
    return this.setSecret(vaultPaths.HUB_CA_DETAILS, value);
  }

  async getHubCACertDetails () {
    return this.getSecret(vaultPaths.HUB_CA_DETAILS);
  }

  async deleteHubCACertDetails () {
    return this.deleteSecret(vaultPaths.HUB_CA_DETAILS);
  }
  // endregion

  // region DFSP Server Cert
  async setDFSPServerCerts (dfspId, value) {
    this.validateId(dfspId, 'dfspId');
    return this.setSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`, value);
  }

  async getDFSPServerCerts (dfspId) {
    this.validateId(dfspId, 'dfspId');
    return this.getSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`);
  }

  async deleteDFSPServerCerts (dfspId) {
    this.validateId(dfspId, 'dfspId');
    return this.deleteSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`);
  }
  // endregion

  async populateDFSPClientCertBundle (dfspId, dfspName, dfspMonetaryZoneId, isProxy, fxpCurrencies) {
    this.validateId(dfspId, 'dfspId');
    const dfspCA = await this.getDFSPCA(dfspId);
    const enrollments = await this.getDFSPOutboundEnrollments(dfspId);
    const dfspClientCert = enrollments
      .filter((en) => en.state === 'CERT_SIGNED')
      .sort((a, b) => b.id - a.id)[0];
    const cert = this.getCertInfo(dfspClientCert.certificate);
    const bundle = {
      ca_bundle: `${dfspCA.intermediateChain}\n${dfspCA.rootCertificate}`,
      client_key: dfspClientCert.key,
      client_cert_chain: `${dfspClientCert.certificate}\n${dfspCA.intermediateChain}\n${dfspCA.rootCertificate}`,
      fqdn: cert.subject.CN,
      host: dfspName,
      currency_code: dfspMonetaryZoneId,
      fxpCurrencies: fxpCurrencies.join(' '),
      isProxy,
    };
    await this.client.write(`${this.mounts.dfspClientCertBundle}/${dfspName}`, bundle);
  }

  async populateDFSPInternalIPWhitelistBundle (value) {
    return this.client.write(`${this.mounts.dfspInternalIPWhitelistBundle}`, value);
  }

  async populateDFSPExternalIPWhitelistBundle (value) {
    return this.client.write(`${this.mounts.dfspExternalIPWhitelistBundle}`, value);
  }

  /**
   * Delete root CA
   * @returns {Promise<void>}
   */
  async deleteCA () {
    await this.client.request({
      path: `/${this.mounts.pki}/root`,
      method: 'DELETE',
    });
  }

  /**
   * Create root CA
   * @param {object} csr
   */
  async createCA (csr, ttl) {
    this.validateCSR(csr);
    try { await this.deleteCA(); } catch (e) { }

    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/root/generate/exported`,
      method: 'POST',
      json: {
        common_name: csr.CN,
        ou: csr.OU,
        organization: csr.O,
        locality: csr.L,
        country: csr.C,
        province: csr.ST,
        key_type: this.keyAlgorithm,
        key_bits: this.keyLength,
        ttl,
      },
    });

    return {
      cert: data.certificate,
      key: data.private_key,
      csr,
    };
  }

  /**
   * Creates hub server certificate
   * @param csrParameters. CSR options, @see CAInitialInfo
   */
  async createHubServerCert (csrParameters) {
    const reqJson = {
      common_name: csrParameters.subject.CN,
    };
    if (csrParameters.extensions?.subjectAltName) {
      const { dns, ips } = csrParameters.extensions.subjectAltName;
      if (dns) {
        reqJson.alt_names = dns.join(',');
      }
      if (ips) {
        reqJson.ip_sans = ips.join(',');
      }
    }
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/issue/${this.pkiServerRole}`,
      method: 'POST',
      json: reqJson,
    });
    return data;
  }

  async revokeHubServerCert (serial) {
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/revoke`,
      method: 'POST',
      json: {
        serial_number: serial
      },
    });
    return data;
  }

  /**
     * Creates a CA
     * @param {CAInitialInfo} caOptionsDoc. Engine options, @see CAInitialInfo
     */
  async createIntermediateCA (caOptionsDoc) {
    this.validateCSR(caOptionsDoc);
    const csr = await this.createIntermediateHubCSR(caOptionsDoc);
    const cert = await this.signIntermediateHubCSR(caOptionsDoc);
    await this.setIntermediateCACert(cert.certificate);

    return {
      cert: cert.certificate,
      csr: csr.csr,
      key: csr.private_key,
    };
  }

  /**
     * Creates intermediate CA CSR
     * @param params. CSR options, @see CAInitialInfo
     */
  async createIntermediateHubCSR (params) {
    const { names } = params;
    const altNames = names.length > 1 ? names.slice(1).map((name) => name.CN).join(',') : '';
    const { data } = await this.client.request({
      path: `/${this.mounts.intermediatePki}/intermediate/generate/exported`,
      method: 'POST',
      json: {
        common_name: names[0].CN,
        alt_names: altNames,
        ou: names.map((name) => name.OU),
        organization: names.map((name) => name.O),
        locality: names.map((name) => name.L),
        country: names.map((name) => name.C),
        province: names.map((name) => name.ST),
        key_type: params.key.algo,
        key_bits: params.key.size,
      },
    });
    return data;
  }

  /**
   *
   * @param {CSRParameters} csrParameters CSR Parameters
   * @returns { csr: String, key:  String, PEM-encoded. Encrypted ( see encryptKey ) }
   */
  async createCSR (csrParameters) {
    const keys = forge.pki.rsa.generateKeyPair(this.keyLength);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;

    if (csrParameters?.subject) {
      csr.setSubject(Object.entries(csrParameters.subject).map(([shortName, value]) => ({
        shortName,
        value
      })));
    }
    if (csrParameters?.extensions?.subjectAltName) {
      const { dns, ips } = csrParameters.extensions.subjectAltName;
      csr.setAttributes([{
        name: 'extensionRequest',
        extensions: [{
          name: 'subjectAltName',
          altNames: [
            ...dns ? dns.map(value => ({ type: VaultPKIEngine.DNS_TYPE, value })) : [],
            ...ips ? ips.map(ip => ({ type: VaultPKIEngine.IP_TYPE, ip })) : []
          ]
        }]
      }]);
    }

    csr.sign(keys.privateKey, forge.md.sha256.create());

    return {
      csr: forge.pki.certificationRequestToPem(csr),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey, 72),
    };
  }

  async signIntermediateHubCSR (csr) {
    const csrInfo = forge.pki.certificationRequestFromPem(csr);
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/root/sign-intermediate`,
      method: 'POST',
      json: {
        use_csr_values: true,
        common_name: csrInfo.subject.getField('CN').value,
        csr,
      },
    });
    return data;
  }

  /**
   * Sign Hub CSR
   * @param csr
   * @returns {Promise<*>}
   */
  async signWithIntermediateCA (csr) {
    const csrInfo = forge.pki.certificationRequestFromPem(csr);
    const { data } = await this.client.request({
      path: `/${this.mounts.intermediatePki}/sign/${this.pkiClientRole}`,
      method: 'POST',
      json: {
        common_name: csrInfo.subject.getField('CN').value,
        csr,
      },
    });
    return data.certificate;
  }

  /**
   * Sign Client (DFSP) CSR and return client certificate
   * @param csr
   * @param commonName
   * @returns {Promise<*>}
   */
  async sign (csr, commonName) {
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/sign/${this.pkiClientRole}`,
      method: 'POST',
      json: {
        common_name: commonName,
        csr,
        ttl: `${this.signExpiryHours}h`,
      },
    });
    return data.certificate;
  }

  async setHubCaCertChain (certChainPem, privateKeyPem) {
    await this.client.request({
      path: `/${this.mounts.pki}/config/ca`,
      method: 'POST',
      json: {
        pem_bundle: `${privateKeyPem}\n${certChainPem}`,
      },
    });

    // Secret object documentation:
    // https://github.com/modusintegration/mojaloop-k3s-bootstrap/blob/e3578fc57a024a41023c61cd365f382027b922bd/docs/README-vault.md#vault-crd-secrets-integration
    // https://vault.koudingspawn.de/supported-secret-types/secret-type-cert
  }

  async getHubCaCertChain () {
    return this.client.request({
      path: `/${this.mounts.pki}/ca_chain`,
      method: 'GET',
    });
  }

  async getRootCaCert () {
    return this.client.request({
      path: `/${this.mounts.pki}/ca/pem`,
      method: 'GET',
    });
  }

  async setHubEndpoints (value) {
    return this.setSecret(vaultPaths.HUB_ENDPOINTS, value);
  }

  async getHubEndpoints () {
    return this.getSecret(vaultPaths.HUB_ENDPOINTS);
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} code validation code
   */
  validateCertificateValidity (serverCert, code) {
    if (!serverCert) {
      const validation = new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate'
      );
      validation.state = ValidationCodes.VALID_STATES.NOT_AVAILABLE;
      return validation;
    }

    try {
      const certInfo = this.getCertInfo(serverCert);
      const notAfterDate = moment(certInfo.notAfter);
      const notBeforeDate = moment(certInfo.notBefore);

      const validation = new Validation(code, true);
      validation.state = ValidationCodes.VALID_STATES.INVALID; // Default state

      if (moment().isBetween(notBeforeDate, notAfterDate)) {
        validation.state = ValidationCodes.VALID_STATES.VALID; // Valid certificate
      } else {
        validation.message = `Certificate is not valid for the current date.`;
      }

      return validation;
    } catch (error) {
      const validation = new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.INVALID,
        'Error processing the certificate'
      );
      validation.state = ValidationCodes.VALID_STATES.INVALID; // Explicitly set state
      return validation;
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER
   *
   * @param {String} serverCert PEM-encoded certificate
   */
  validateCertificateUsageServer (serverCert) {
    if (!serverCert) {
      const validation = new Validation(
        ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate'
      );
      validation.state = ValidationCodes.VALID_STATES.NOT_AVAILABLE; // Explicitly set state
      return validation;
    }

    const cert = forge.pki.certificateFromPem(serverCert);
    const extKeyUsage = cert.getExtension('extKeyUsage');
    if (!extKeyUsage || !extKeyUsage.serverAuth) {
      const validation = new Validation(
        ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        'Certificate doesn\'t have the "TLS WWW server authentication" key usage extension'
      );
      validation.state = ValidationCodes.VALID_STATES.INVALID; // Explicitly set state
      return validation;
    }

    const validation = new Validation(
      ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code,
      true,
      ValidationCodes.VALID_STATES.VALID,
      'Certificate has the "TLS WWW server authentication" key usage extension'
    );
    validation.state = ValidationCodes.VALID_STATES.VALID; // Explicitly set state
    return validation;
  }

  splitCertificateChain (chain) {
    const certificateEndDelimiter = '-----END CERTIFICATE-----';
    const beginCertRegex = /(?=-----BEGIN)/g;

    // Add type check to ensure chain is a string
    if (!chain || typeof chain !== 'string') {
      return [];
    }

    return chain.split(beginCertRegex)
      .filter(cert => cert.match(/BEGIN/g))
      .map(cert => cert.slice(0, cert.indexOf(certificateEndDelimiter)) + certificateEndDelimiter);
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded intermediate chain
   * @param {String} [rootCertificate] PEM-encoded root certificate
   */
  validateCertificateChain (serverCert, intermediateChain, rootCertificate) {
    const chain = [rootCertificate, ...this.splitCertificateChain(intermediateChain || '')].filter(cert => cert);
    const caStore = forge.pki.createCaStore(chain);
    try {
      const cert = forge.pki.certificateFromPem(serverCert);
      forge.pki.verifyCertificateChain(caStore, [cert]);
    } catch (e) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.INVALID, e.message);
    }
    return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.VALID, 'Certificate chain valid');
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_*
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {Integer} keyLength key length in bits
   */
  validateCertificateKeyLength (serverCert, keyLength, code) {
    const { valid, reason } = this.verifyCertKeyLength(serverCert, keyLength);
    if (!valid) {

      const validation = new Validation(code, true);
      validation.result = ValidationCodes.VALID_STATES.INVALID;

      validation.messageTemplate = 'Certificate key length ${data.actualKeySize.value} invalid, should be ${data.keyLength.value}';
      validation.details = reason;
      validation.data = {
        actualKeySize: {
          type: 'INTEGER',
          value: reason.actualKeySize
        },
        keyLength: {
          type: 'INTEGER',
          value: keyLength
        }
      };
      validation.message = `Certificate key length ${validation.data.actualKeySize.value} invalid, should be ${validation.data.keyLength.value}`;
      return validation;
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, 'Certificate key length valid');
    }
  }

  /**
   * Verified all the requires distinguished names
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   * @returns {Validation} validation
   */
  verifyCsrMandatoryDistinguishedNames (csr, code) {
    const MANDATORY_DISTINGUISHED_NAMES = ['CN', 'OU', 'O', 'L', 'ST', 'C', 'E'];
    try {
      const csrInfo = this.getCSRInfo(csr);
      for (const field of MANDATORY_DISTINGUISHED_NAMES) {
        if (!csrInfo.subject[field]) {
          return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
            `CSR missing required distinguished name attributes. Missing: ${field}`);
        }
      }
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR has all mandatory distiguished name attributes');
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed'
      );
    }
  }

  /**
   * Verifies the signature on the CSR ( from https://www.openssl.org/docs/man1.1.1/man1/openssl-req.html ).
   *
   * @param {String} csrPem PEM-encoded CSR
   * @returns {Validation} validation
   */
  validateCsrSignatureValid (csrPem) {
    try {
      const csr = forge.pki.certificationRequestFromPem(csrPem);
      csr.verify();
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR passed verification');
    } catch (e) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR failed verification: ${e.message}`);
    }
  }

  /**
   * Verifies that the signature algorithm is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  validateCsrSignatureAlgorithm (csr, code, algo) {
    try {
      const { valid, reason } = this.verifyCSRAlgorithm(csr, algo);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Signature Algorithm : ${reason.actualAlgorithm}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        );
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed'
      );
    }
  }

  /**
   * Verifies that the signature algorithm is the one specified by param
   *
   * @param {String} csr PEM-encoded certificate
   * @param {String} code Validation code
   * @param {String} algo algorithm
   */
  validateCertificateSignatureAlgorithm (certificate, code, algo) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    try {
      const { valid, reason } = this.verifyCertAlgorithm(certificate, [algo]);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `certificate has a valid Signature Algorithm : ${algo}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `certificate has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        );
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'certificate couldn\'t be parsed'
      );
    }
  }

  /**
   * Verifies that the Public Key length is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  validateCsrPublicKeyLength (csr, code, length) {
    try {
      const { valid, reason } = this.verifyCSRKeyLength(csr, length);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Public Key length of ${length}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR Public Key length is not ${length}, it is ${reason.actualKeySize}`);
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed');
    }
  }

  /**
   * The Certificate should be signed by the DFSP CA.
   * data.result = TRUST_CHAIN_VALID or SELF_SIGNED or INVALID or NOT_AVAILABLE if the ca info is not present
   * @param {String} certificate PEM-encoded certificate
   * @param {DFSPCAsModel} dfspCA
   * @param {String} code
   */
  verifyCertificateSignedByDFSPCA (certificate, dfspCA, code) {
    if (!dfspCA || (!dfspCA.rootCertificate && !dfspCA.intermediateChain)) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No dfsp CA');
    }

    if (dfspCA.validationState === INVALID) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'Invalid dfsp ca root or chain');
    } else {
      const chain = [dfspCA.rootCertificate, ...this.splitCertificateChain(dfspCA.intermediateChain || '')].filter(cert => cert);
      const caStore = forge.pki.createCaStore(chain);
      try {
        const cert = forge.pki.certificateFromPem(certificate);
        forge.pki.verifyCertificateChain(caStore, [cert]);
      } catch (e) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, e.message);
      }
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, 'The Certificate is signed by the DFSP CA');
    }
  }

  /**
   * Verifies that the certificate and the csr have the same Public Key
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  verifyCertificateCSRPublicKey (code, certificate, csr) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }
    const certKey = forge.pki.publicKeyToPem(forge.pki.certificateFromPem(certificate).publicKey);
    const csrKey = forge.pki.publicKeyToPem(forge.pki.certificationRequestFromPem(csr).publicKey);

    if (certKey === csrKey) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR and Certificate have the same Public Key');
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR and Certificate have different Public Keys');
    }
  }

  /**
   * Verifies that the certificate must have the "TLS WWW client authentication" key usage extension.
   * See https://tools.ietf.org/html/rfc5280#section-4.2.1.12'
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} code Validation code
   * @returns {Validation} validation
   */
  verifyCertificateUsageClient (certificate, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    const cert = forge.pki.certificateFromPem(certificate);
    const extKeyUsage = cert.getExtension('extKeyUsage');
    if (!extKeyUsage || !extKeyUsage.clientAuth) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'Certificate doesn\'t have the "TLS WWW client authentication" key usage extension');
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'Certificate has the "TLS WWW client authentication" key usage extension');
  }

  /**
   * Verifies that the certificate and the csr have the same Subject Information ( distinguished name and extensions )
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  verifyCertificateCSRSameSubject (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }

    if (enrollment.caType && enrollment.caType === CAType.EXTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'It has an External CA');
    }

    const csrInfo = this.getCSRInfo(enrollment.csr);
    const certInfo = this.getCertInfo(enrollment.certificate);

    const { valid, reason } = this.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same Subject Information', reason);
    }

    const { valid: validAltName, reason: reasonAltName } = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    if (!validAltName) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same Subject Extension Information', reasonAltName);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The CSR and the Certificate must have the same Subject Information');
  }

  /**
   *
   * @param {String} code validation code
   * @param {Object} enrollment Enrollment
   */
  verifyCertificateCSRSameCN (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }

    if (enrollment.caType && enrollment.caType === CAType.INTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'It has an Internal CA');
    }

    const csrInfo = this.getCSRInfo(enrollment.csr);
    const certInfo = this.getCertInfo(enrollment.certificate);

    const { valid, reason } = this.compareCNBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same CN', reason);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The CSR and the Certificate must have the same CN');
  }

  /**
   * Verifies that the CSR Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  verifyCSRKeyLength (csr, minLength) {
    const csrInfo = this.getCSRInfo(csr);
    if (csrInfo.publicKeyLength < minLength) {
      return { valid: false, reason: { actualKeySize: csrInfo.publicKeyLength, minKeySize: minLength } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the Certificate Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  verifyCertKeyLength (cert, minLength) {
    const certInfo = this.getCertInfo(cert);
    if (certInfo.publicKeyLength < minLength) {
      return { valid: false, reason: { actualKeySize: certInfo.publicKeyLength, minKeySize: minLength } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the CSR signature algorithm is included in the algorithms list
   * @param {String} csr PEM-encoded CSR
   * @param {String[]} algorithms Array of valid algorithms
   * @returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   */
  verifyCSRAlgorithm (csr, algorithms) {
    const csrInfo = this.getCSRInfo(csr);
    const valid = algorithms.includes(csrInfo.signatureAlgorithm);
    return { valid, reason: { actualAlgorithm: csrInfo.signatureAlgorithm, algorithms } };
  }

  /**
   * Verifies that the Cert signature algorithm is the same as the parameter
   *
   * algorithms: String[]
   * returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  verifyCertAlgorithm (cert, algorithms) {
    const certInfo = this.getCertInfo(cert);
    if (!algorithms.includes(certInfo.signatureAlgorithm)) {
      return { valid: false, reason: { actualAlgorithm: certInfo.signatureAlgorithm, algorithms } };
    }
    return { valid: true };
  }

  static compareKeys (a, b) {
    return a.n.toString(16) === b.n.toString(16) &&
      a.e.toString(16) === b.e.toString(16);
  }

  /**
   * Verifies that the Certificate Public Key must match the private key used to sign the CSR.
   * Only available if the CSR was created by the Connection-Manager. If the CSR was uploaded instead of generated by
   * the Connection Manager, and there's no private key associated, this will be set the state to NOT_AVAILABLE
   *
   * @param {String} code Validation code
   * @param {String} key PEM-encoded key.
   * @param {String} certificate PEM-encoded certificate
   * @returns {Validation} validation
   */
  verifyCertificatePublicKeyMatchPrivateKey (certificate, key, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!key) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No private key');
    }

    const certKey = forge.pki.certificateFromPem(certificate).publicKey;
    const privateKey = forge.pki.privateKeyFromPem(key);
    const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

    if (!VaultPKIEngine.compareKeys(publicKey, certKey)) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'the Certificate Public Key doesn\'t match the private key used to sign the CSR');
    }
    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, 'the Certificate Public Key matches the private key used to sign the CSR');
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE
   *
   * @param {String} rootCertificate PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate TODO: add validations
   * @param {String} code validation code
   * @returns {Validation} validation
   */
  validateCertificateUsageCA (rootCertificate, intermediateChain, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No root certificate and currently not validating intermediate CAs if present');
    }

    const cert = forge.pki.certificateFromPem(rootCertificate);
    const basicConstraints = cert.getExtension('basicConstraints');
    if (!basicConstraints || !basicConstraints.cA) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The root certificate doesn\'t have the CA basic contraint extension ( CA = true )');
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The root certificate has the CA basic contraint extension ( CA = true )');
  }

  /*
  isRSACertificate (certPem) {
    const cert = forge.pki.certificateFromPem(certPem);

    const { asn1 } = forge;
    const publicKeyValidator = {
      name: 'SubjectPublicKeyInfo',
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      captureAsn1: 'subjectPublicKeyInfo',
      value: [{
        name: 'SubjectPublicKeyInfo.AlgorithmIdentifier',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
          name: 'AlgorithmIdentifier.algorithm',
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: false,
          capture: 'publicKeyOid'
        }]
      }, {
        // subjectPublicKey
        name: 'SubjectPublicKeyInfo.subjectPublicKey',
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        value: [{
          // RSAPublicKey
          name: 'SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey',
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: true,
          optional: true,
          captureAsn1: 'rsaPublicKey'
        }]
      }]
    };

    const subjectPublicKeyInfo = forge.pki.publicKeyToAsn1(cert.publicKey);

    const capture = {};
    const errors = [];
    if (!asn1.validate(
      publicKeyValidator, subjectPublicKeyInfo, validator, capture, errors)) {
      throw 'ASN.1 object is not a SubjectPublicKeyInfo.';
    }
    // capture.subjectPublicKeyInfo contains the full ASN.1 object
    // capture.rsaPublicKey contains the full ASN.1 object for the RSA public key
    // capture.publicKeyOid only contains the value for the OID
    const oid = asn1.derToOid(capture.publicKeyOid);
    if (oid !== pki.oids.rsaEncryption) {
      throw 'Unsupported OID.';
    }
  }
*/

  /**
   *
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyRootCertificate (rootCertificate, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No root certificate');
    }

    try {
      const cert = forge.pki.certificateFromPem(rootCertificate);
      let state;
      if (cert.subject.hash === cert.issuer.hash) {
        state = VALID_SELF_SIGNED;
      } else {
        forge.pki.verifyCertificateChain(this.trustedCaStore, [cert]);
        state = VALID_SIGNED;
      }
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        `The root certificate is valid with ${state} state.`, state);
    } catch (e) {
      logger.warn('Root certificate validation failed', { error: e.message, certificate: rootCertificate });
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The root certificate must be valid and be self-signed or signed by a global root.');
    }
  }

  /**
   * Verifies that the intermediateChain is made of valid CAs and that the top of the chain is signed by the root.
   * If rootCertificate is null, the top of the chain should be signed by a global root.
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} intermediateChain PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyIntermediateChain (rootCertificate, intermediateChain, code) {
    const intermediateCerts = this.splitCertificateChain(intermediateChain || '');
    if (!intermediateCerts.length) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No intermediate chain');
    }

    const caStore = rootCertificate ? forge.pki.createCaStore([rootCertificate]) : this.trustedCaStore;
    try {
      forge.pki.verifyCertificateChain(caStore, intermediateCerts.map(cert => forge.pki.certificateFromPem(cert)));
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'The intermediateChain is made of valid CAs and at the top of the chain is signed by the root.');
    } catch (e) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'the intermediateChain must be made of valid CAs and that the top of the chain is signed by the root', e.message);
    }
  }

  static _getSubjectInfo (forgeSubject) {
    const subjectInfo = {};
    const subjectFields = ['CN', 'O', 'OU', 'C', 'L', 'ST', 'E'];
    subjectFields
      .filter(f => forgeSubject.getField(f))
      .forEach(f => {
        subjectInfo[f] = forgeSubject.getField(f).value;
      });
    return subjectInfo;
  }

  static _getExtensionsInfo (forgeCert) {
    const extensions = {
      subjectAltName: {
        dns: [],
        ips: [],
        uris: [],
        emailAddresses: [],
      },
    };

    const altNames = extensions.subjectAltName;

    forgeCert
      ?.extensions
      ?.find(t => t.name === 'subjectAltName')
      ?.altNames
      .forEach(item => {
        switch (item.type) {
          case VaultPKIEngine.DNS_TYPE:
            altNames.dns.push(item.value);
            break;
          case VaultPKIEngine.URI_TYPE:
            altNames.uris.push(item.value);
            break;
          case VaultPKIEngine.EMAIL_TYPE:
            altNames.emailAddresses.push(item.value);
            break;
          case VaultPKIEngine.IP_TYPE:
            altNames.ips.push(item.ip);
            break;
        }
      });

    return extensions;
  }

  /**
   * Returns an object with the CSR contents and info
   *
   * @param {String} csrPem PEM-encoded CSR
   * @returns {CSRInfo} The CSR Info
   */
  getCSRInfo(csrPem) {
    if (!csrPem) {
      throw new InvalidEntityError('Empty or null CSR');
    }

    try {
      const csr = forge.pki.certificationRequestFromPem(csrPem);

      return {
        subject: VaultPKIEngine._getSubjectInfo(csr.subject),
        extensions: VaultPKIEngine._getExtensionsInfo(csr.getAttribute({ name: 'extensionRequest' })),
        signatureAlgorithm: forge.pki.oids[csr.siginfo.algorithmOid],
        publicKeyLength: csr.publicKey.n.bitLength(),
      };
    } catch (err) {
      throw new InvalidEntityError('Invalid CSR: ' + err.message); // Wrap the error
    }
  }


  /**
   * Returns an object with the Certificate contents and info
   *
   * @param {String} certPem PEM-encoded Certificate
   * @returns {CertInfo} The Certificate Info
   */
  getCertInfo(certPem) {
    if (!certPem) {
      throw new InvalidEntityError('Empty or null cert');
    }

    try {
      const cert = forge.pki.certificateFromPem(certPem);

      return {
        subject: VaultPKIEngine._getSubjectInfo(cert.subject),
        issuer: VaultPKIEngine._getSubjectInfo(cert.issuer),
        extensions: VaultPKIEngine._getExtensionsInfo(cert),
        serialNumber: cert.serialNumber,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        signatureAlgorithm: forge.pki.oids[cert.siginfo.algorithmOid],
        publicKeyLength: cert.publicKey.n.bitLength(),
      };
    } catch (err) {
      throw new InvalidEntityError('Invalid certificate: ' + err.message); // Wrap the error
    }
  }


  validateCSR(csr) {
    const schema = Joi.object().keys({
      CN: Joi.string().description('Common Name').required(),
      E: Joi.string().description('Email'),
      O: Joi.string().description('Organization').required(),
      OU: Joi.string().description('Organizational Unit'),
      C: Joi.string().description('Country'),
      ST: Joi.string().description('State'),
      L: Joi.string().description('Location'),
    });

    const result = schema.validate(csr);
    if (result.error) {
      throw new ValidationError('Invalid CAInitialInfo document: ' + result.error.message);
    }
  }
}

VaultPKIEngine.DNS_TYPE = 2;
VaultPKIEngine.URI_TYPE = 6;
VaultPKIEngine.EMAIL_TYPE = 2;
VaultPKIEngine.IP_TYPE = 7;

module.exports = VaultPKIEngine;
