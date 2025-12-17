// Unit test environment setup
// This file is loaded automatically by jest.config.js

const tmp = require('tmp');
const { randomUUID } = require('node:crypto');
const fs = require('fs');

const createTemp = (content) => {
  const tempFile = tmp.fileSync({ discardDescriptor: true, keep: false });
  fs.writeFileSync(tempFile.name, content);
  return tempFile.name;
};

// Required by Constants.js (loaded when importing most modules)
process.env.VAULT_AUTH_METHOD = 'APP_ROLE';
process.env.VAULT_ROLE_ID_FILE = createTemp(randomUUID());
process.env.VAULT_ROLE_SECRET_ID_FILE = createTemp(randomUUID());
process.env.VAULT_PKI_CLIENT_ROLE = 'example.com';
process.env.VAULT_PKI_SERVER_ROLE = 'example.com';
process.env.SWITCH_ID = 'switch';
process.env.LOG_LEVEL = 'warn';
