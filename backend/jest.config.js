'use strict';

module.exports = {
  testEnvironment: 'node',

  // Load test env vars before any module under test is required.
  setupFiles: ['./src/__tests__/setupEnv.js'],

  // Run migrations against the test DB once before all suites.
  globalSetup: './src/__tests__/globalSetup.js',

  // Only look for test files inside __tests__/.
  testMatch: ['**/__tests__/**/*.test.js'],

  // Sequential execution (DB tests must not run in parallel).
  // --runInBand is also passed via the npm script, but this enforces it
  // for anyone calling jest directly.
  maxWorkers: 1,

  verbose: true,
};
