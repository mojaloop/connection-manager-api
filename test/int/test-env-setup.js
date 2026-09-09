// Integration test environment setup
// This file is loaded automatically by jest.config.js setupFiles
// It configures all environment variables required for integration tests

// Test mode flags
process.env.TEST = 'true';
process.env.TEST_INT = 'true';

// Logging
process.env.LOG_LEVEL = 'warn';

// Server
process.env.PORT = '3001';
process.env.CLIENT_URL = 'http://mcm.localhost/';

// Database
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '3306';
process.env.DATABASE_USER = 'mcm';
process.env.DATABASE_PASSWORD = 'mcm';
process.env.DATABASE_SCHEMA = 'mcm';

// Vault PKI
process.env.VAULT_ENDPOINT = 'http://vault.mcm.localhost';
process.env.VAULT_AUTH_METHOD = 'APP_ROLE';
process.env.VAULT_ROLE_ID_FILE = './docker/vault/tmp/role-id';
process.env.VAULT_ROLE_SECRET_ID_FILE = './docker/vault/tmp/secret-id';
process.env.VAULT_PKI_CLIENT_ROLE = 'example.com';
process.env.VAULT_PKI_SERVER_ROLE = 'example.com';

// Switch/Hub
process.env.SWITCH_ID = 'switch';

// IAM (Ory: Hydra + Kratos + Keto)
process.env.IAM_ENABLED = 'true';
process.env.IAM_AUTO_CREATE_ACCOUNTS = 'true';

process.env.HYDRA_PUBLIC_URL = 'http://hydra.mcm.localhost';
process.env.HYDRA_ADMIN_URL = 'http://hydra-admin.mcm.localhost';
process.env.HYDRA_AUDIENCE = 'connection-manager-api';

process.env.KRATOS_PUBLIC_URL = 'http://kratos.mcm.localhost';
process.env.KRATOS_ADMIN_URL = 'http://kratos-admin.mcm.localhost';
process.env.KRATOS_IDENTITY_SCHEMA_ID = 'default';

process.env.KETO_READ_URL = 'http://keto-read.mcm.localhost';
process.env.KETO_WRITE_URL = 'http://keto-write.mcm.localhost';

process.env.IAM_PROVISIONING_URL = 'http://iam.mcm.localhost';
process.env.IAM_DFSP_RESOURCE_NAME = 'Participant';
process.env.IAM_DFSP_ADMIN_ROLE = 'dfsp-operator';
process.env.IAM_DFSP_CLIENT_ROLE = 'dfsp-client';

// Features
process.env.DFSP_WATCHER_ENABLED = 'false';
