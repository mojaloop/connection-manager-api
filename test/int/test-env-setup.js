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

// IAM
process.env.IAM_ENABLED = 'false';

// Features
process.env.DFSP_WATCHER_ENABLED = 'false';
