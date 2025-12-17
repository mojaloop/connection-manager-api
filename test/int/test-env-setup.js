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

// Authentication
process.env.AUTH_ENABLED = 'true';

// Keycloak integration
process.env.KEYCLOAK_ENABLED = 'true';
process.env.KEYCLOAK_BASE_URL = 'http://keycloak.mcm.localhost';
process.env.KEYCLOAK_DISCOVERY_URL = 'http://keycloak.mcm.localhost/realms/dfsps/.well-known/openid-configuration';
process.env.KEYCLOAK_ADMIN_CLIENT_ID = 'connection-manager-api-service';
process.env.KEYCLOAK_ADMIN_CLIENT_SECRET = 'dfsps123';
process.env.KEYCLOAK_DFSPS_REALM = 'dfsps';
process.env.KEYCLOAK_AUTO_CREATE_ACCOUNTS = 'true';

// OpenID Connect (2FA Authentication)
process.env.OPENID_ENABLED = 'true';
process.env.OPENID_ENABLE_2FA = 'true';
process.env.OPENID_ALLOW_INSECURE = 'true';
process.env.OPENID_DISCOVERY_URL = 'http://keycloak.mcm.localhost/realms/dfsps/.well-known/openid-configuration';
process.env.OPENID_CLIENT_ID = 'connection-manager-auth-client';
process.env.OPENID_CLIENT_SECRET = 'dfsps456';
process.env.OPENID_REDIRECT_URI = 'http://mcm.localhost/api/auth/callback';

// Cookie and role settings
process.env.OPENID_JWT_COOKIE_NAME = 'MCM-API_ACCESS_TOKEN';
process.env.OPENID_EVERYONE_ROLE = 'everyone';
process.env.OPENID_MTA_ROLE = 'mta';
process.env.OPENID_PTA_ROLE = 'pta';

// Session
process.env.SESSION_SECRET = 'test-session-secret-for-integration-tests';

// Features
process.env.DFSP_WATCHER_ENABLED = 'false';
