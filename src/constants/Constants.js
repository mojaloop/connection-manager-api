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
  CLIENT_URL: env.get('CLIENT_URL').default('http://localhost:8081/').asString(),

  KEYCLOAK: {
    ENABLED: env.get('KEYCLOAK_ENABLED').default('false').asBool(),
    BASE_URL: env.get('KEYCLOAK_BASE_URL').default('http://localhost:8080').asString(),
    DISCOVERY_URL: env.get('KEYCLOAK_DISCOVERY_URL').default('http://localhost:8080/realms/dfsps/.well-known/openid-configuration').asString(),
    ADMIN_CLIENT_ID: env.get('KEYCLOAK_ADMIN_CLIENT_ID').default('connection-manager-client').asString(),
    ADMIN_CLIENT_SECRET: env.get('KEYCLOAK_ADMIN_CLIENT_SECRET').asString(),
    DFSPS_REALM: env.get('KEYCLOAK_DFSPS_REALM').default('dfsps').asString(),
    AUTO_CREATE_ACCOUNTS: env.get('KEYCLOAK_AUTO_CREATE_ACCOUNTS').default('false').asBool(),
  },

  KETO: {
    ENABLED: env.get('ENABLE_KETO').default('false').asBool(),
    WRITE_URL: env.get('KETO_WRITE_URL').default('http://localhost:4467').asString(),
  },

  OPENID: {
    ENABLE_2FA: env.get('OPENID_ENABLE_2FA').default('false').asBool(),
    ENABLED: env.get('OPENID_ENABLED').default('false').asBool(),
    AUDIENCE: env.get('OPENID_AUDIENCE').default('connection-manager-api').asString(),
    ALLOW_INSECURE: env.get('OPENID_ALLOW_INSECURE').default('false').asBool(),
    DISCOVERY_URL: env.get('OPENID_DISCOVERY_URL').asString(),
    CLIENT_ID: env.get('OPENID_CLIENT_ID').asString(),
    CLIENT_SECRET: env.get('OPENID_CLIENT_SECRET').asString(),
    CALLBACK: env.get('LOGIN_CALLBACK').default('http://localhost:3001/api/auth/callback').asString(),
    JWT_COOKIE_NAME: env.get('OPENID_JWT_COOKIE_NAME').default('MCM-API_ACCESS_TOKEN').asString(),
    GROUPS: {
      APPLICATION: env.get('OPENID_APPLICATION_GROUP').default('Application').asString(),
      EVERYONE: env.get('OPENID_EVERYONE_GROUP').default('everyone').asString(),
      MTA: env.get('OPENID_MTA_GROUP').default('MTA').asString(),
      PTA: env.get('OPENID_PTA_GROUP').default('PTA').asString(),
      DFSP: env.get('OPENID_DFSP_GROUP').default('DFSP').asString()
    }
  },

  SESSION_STORE: {
    SECRET: env.get('SESSION_STORE_SECRET').default('connection_manager_session_secret').asString(),
    COOKIE_SAME_SITE_STRICT: env.get('SESSION_COOKIE_SAME_SITE_STRICT').default('true').asBool(),
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
    auth: vaultAuth,
    signExpiryHours: env.get('VAULT_SIGN_EXPIRY_HOURS').default('43800').asString(),
    keyLength: env.get('PRIVATE_KEY_LENGTH').default(4096).asIntPositive(),
    keyAlgorithm: env.get('PRIVATE_KEY_ALGORITHM').default('rsa').asString(),
    internalCaTtl: env.get('INTERNAL_CA_TTL').default('8760h').asString(),
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
};
