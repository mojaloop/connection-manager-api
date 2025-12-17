module.exports = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  collectCoverage: false,
  clearMocks: true,
  setupFiles: ['<rootDir>/test-env-setup.js'],
  testTimeout: 300000
};
