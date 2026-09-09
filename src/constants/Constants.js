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

require('dotenv/config');
const fs = require('node:fs');
const pathModule = require('node:path');
const { from } = require('env-var');
const constValues = require('./constValues');

function getFileContent (path) {
  const resolvedPath = path.startsWith('/')
    ? path
    : pathModule.resolve(__dirname, '../..', path); // .env file is in the root

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File ${resolvedPath} doesn't exist`);
  }
  return fs.readFileSync(resolvedPath);
}

const env = from(process.env, {
  asFileContent: (path) => getFileContent(path),
  asFileListContent: (pathList) => pathList.split(',').map((path) => getFileContent(path)),
  asJsonConfig: (path) => JSON.parse(getFileContent(path)),
  asTextFileContent: (path) => getFileContent(path).toString().trim(),
});

const vaultAuthMethod = env.get('VAULT_AUTH_METHOD').required().asEnum(['K8S', 'APP_ROLE']);
let vaultAuth;
if (vaultAuthMethod === 'K8S') {
  vaultAuth = {
    k8s: {
      token: env.get('VAULT_K8S_TOKEN_FILE').default('/var/run/secrets/kubernetes.io/serviceaccount/token').asTextFileContent(),
      mountPoint: env.get('VAULT_K8S_AUTH_MOUNT_POINT').default('kubernetes').asString(),
      role: env.get('VAULT_K8S_ROLE').required().asString(),
    },
  };
} else if (vaultAuthMethod === 'APP_ROLE') {
  vaultAuth = {
    appRole: {
      // Generated per: https://www.vaultproject.io/docs/auth/approle#via-the-cli-1
      // Or: https://github.com/kr1sp1n/node-vault/blob/70097269d35a58bb560b5290190093def96c87b1/example/auth_approle.js
      roleId: env.get('VAULT_ROLE_ID_FILE').default('docker/vault/tmp/role-id').asTextFileContent(),
      roleSecretId: env.get('VAULT_ROLE_SECRET_ID_FILE').default('docker/vault/tmp/secret-id').asTextFileContent(),
    },
  };
}

const certManager = {
  enabled: env.get('CERT_MANAGER_ENABLED').default('false').asBool(),
};

if (certManager.enabled) {
  certManager.serverCertSecretName = env.get('CERT_MANAGER_SERVER_CERT_SECRET_NAME').asString();
  certManager.serverCertSecretNamespace = env.get('CERT_MANAGER_SERVER_CERT_SECRET_NAMESPACE').asString();
  certManager.jwsHubCertSecretName = env.get('CERT_MANAGER_JWS_HUB_CERT_SECRET_NAME').asString();
  certManager.jwsHubCertSecretNamespace = env.get('CERT_MANAGER_JWS_HUB_CERT_SECRET_NAMESPACE').asString();
}

module.exports = {
  ...constValues,
  getFileContent,
  SERVER: {
    PORT: env.get('PORT').default('3001').asPortNumber(),
  },

  // If set to true, enables logging of request metadata using Winston.
  // Note: Enabling this may expose sensitive headers in logs.
  WINSTON_REQUEST_META_DATA: env.get('WINSTON_REQUEST_META_DATA').default('false').asBool(),
  CLIENT_URL: env.get('CLIENT_URL').default('http://mcm.localhost/').asString(),

  IAM: {
    ENABLED: env.get('IAM_ENABLED').default('false').asBool(),
    AUTO_CREATE_ACCOUNTS: env.get('IAM_AUTO_CREATE_ACCOUNTS').default('true').asBool(),
    PROVISIONING_URL: env.get('IAM_PROVISIONING_URL').default('http://iam-provisioning.ory.svc.cluster.local').asString(),
    // Deployment configuration for DFSP onboarding, passed through opaquely:
    // the resource name the deployment files DFSPs under, and the role each
    // principal is assigned over the DFSP. The IAM decides what each grants.
    // An empty role assigns nothing.
    DFSP_RESOURCE_NAME: env.get('IAM_DFSP_RESOURCE_NAME').default('').asString(),
    DFSP_ADMIN_ROLE: env.get('IAM_DFSP_ADMIN_ROLE').default('').asString(),
    DFSP_CLIENT_ROLE: env.get('IAM_DFSP_CLIENT_ROLE').default('').asString(),
  },

  HYDRA: {
    ADMIN_URL: env.get('HYDRA_ADMIN_URL').default('http://hydra-admin.mcm.localhost').asString(),
    PUBLIC_URL: env.get('HYDRA_PUBLIC_URL').default('http://hydra.mcm.localhost').asString(),
    AUDIENCE: env.get('HYDRA_AUDIENCE').default('connection-manager-api').asString(),
  },

  KRATOS: {
    ADMIN_URL: env.get('KRATOS_ADMIN_URL').default('http://kratos-admin.mcm.localhost').asString(),
    PUBLIC_URL: env.get('KRATOS_PUBLIC_URL').default('http://kratos.mcm.localhost').asString(),
    IDENTITY_SCHEMA_ID: env.get('KRATOS_IDENTITY_SCHEMA_ID').default('default').asString(),
    INVITE_RETURN_TO_URL: env.get('KRATOS_INVITE_RETURN_TO_URL').default('http://mcm.localhost/').asString(),
    INVITE_TOKEN_TTL: env.get('KRATOS_INVITE_TOKEN_TTL').default('168h').asString(),
  },

  EXTRA_TLS: {
    EXTRA_CERTIFICATE_CHAIN_FILE_NAME: env.get('EXTRA_CERTIFICATE_CHAIN_FILE_NAME').asString(),
    EXTRA_ROOT_CERT_FILE_NAME: env.get('EXTRA_ROOT_CERT_FILE_NAME').asString(),
  },

  DATABASE: {
    DATABASE_HOST: env.get('DATABASE_HOST').default('localhost').asString(),
    DATABASE_PORT: env.get('DATABASE_PORT').default(3306).asPortNumber(),
    DATABASE_USER: env.get('DATABASE_USER').default('mcm').asString(),
    DATABASE_PASSWORD: env.get('DATABASE_PASSWORD').default('mcm').asString(),
    DATABASE_SCHEMA: env.get('DATABASE_SCHEMA').default('mcm').asString(),
    DB_RETRIES: env.get('DB_RETRIES').default('10').asInt(),
    DB_CONNECTION_RETRY_WAIT_MILLISECONDS: env
      .get('DB_CONNECTION_RETRY_WAIT_MILLISECONDS')
      .default('1000')
      .asInt(),
    DB_POOL_SIZE_MAX: env.get('DB_POOL_SIZE_MAX').default('10').asInt(),
    DATABASE_SSL_ENABLED: env.get('DATABASE_SSL_ENABLED').default('false').asBool(),
    DATABASE_SSL_VERIFY: env.get('DATABASE_SSL_VERIFY').default('false').asBool(),
    DATABASE_SSL_CA: env.get('DATABASE_SSL_CA').default('').asString(),
  },
  switchFQDN: env.get('SWITCH_FQDN').default('switch.example.com').asString(),
  switchId: env.get('SWITCH_ID').required().asString(),
  switchEmail: env.get('SWITCH_EMAIL').default('switch@hub.local').asString(),

  vault: {
    endpoint: env.get('VAULT_ENDPOINT').default('http://127.0.0.1:8233').asString(),
    mounts: {
      pki: env.get('VAULT_MOUNT_PKI').default('pki').asString(),
      intermediatePki: env.get('VAULT_MOUNT_INTERMEDIATE_PKI').default('pki_int').asString(),
      kv: env.get('VAULT_MOUNT_KV').default('secrets').asString(),
      dfspClientCertBundle: env.get('VAULT_MOUNT_DFSP_CLIENT_CERT_BUNDLE').default('onboarding_pm4mls').asString(),
      dfspInternalIPWhitelistBundle: env.get('VAULT_MOUNT_DFSP_INT_IP_WHITELIST_BUNDLE').default('whitelist_pm4mls').asString(),
      dfspExternalIPWhitelistBundle: env.get('VAULT_MOUNT_DFSP_EXT_IP_WHITELIST_BUNDLE').default('whitelist_fsps').asString(),
    },
    pkiServerRole: env.get('VAULT_PKI_SERVER_ROLE').required().asString(),
    pkiClientRole: env.get('VAULT_PKI_CLIENT_ROLE').required().asString(),
    bundleTtl: env.get('VAULT_BUNDLE_TTL').default('5m').asString(),
    auth: vaultAuth,
    signExpiryHours: env.get('VAULT_SIGN_EXPIRY_HOURS').default('43800').asString(),
    keyLength: env.get('PRIVATE_KEY_LENGTH').default(4096).asIntPositive(),
    keyAlgorithm: env.get('PRIVATE_KEY_ALGORITHM').default('rsa').asString(),
    internalCaTtl: env.get('INTERNAL_CA_TTL').default('8760h').asString(),
    inboundEnrollmentRetentionCount: env.get('INBOUND_ENROLLMENT_RETENTION_COUNT').default(10).asIntPositive(),
  },
  certManager,

  auth: {
    enabled: env.get('AUTH_ENABLED').asBoolStrict(),
    creds: {
      user: env.get('AUTH_USER').asString(),
      pass: env.get('AUTH_PASS').asString(),
    }
  },

  clientCsrParameters: env.get('CLIENT_CSR_PARAMETERS').asJsonConfig(),
  serverCsrParameters: env.get('SERVER_CSR_PARAMETERS').asJsonConfig(),
  caCsrParameters: env.get('CA_CSR_PARAMETERS').asJsonConfig(),

  dfspWatcherEnabled: env.get('DFSP_WATCHER_ENABLED').default('false').asBool(),
  dfspIdHeaderValidationEnabled: env.get('DFSP_ID_HEADER_VALIDATION_ENABLED').default('true').asBool(),
};
