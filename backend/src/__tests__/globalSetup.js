'use strict';

/**
 * Jest globalSetup — runs once in its own process before any test suite.
 * Loads the test env and runs the SQL migrations against the test DB.
 */
const path = require('path');

// Load test env so DATABASE_URL is correct for the migration client.
require('dotenv').config({
  path:     path.join(__dirname, '../../../.env.test'),
  override: true,
});

const { runMigrations } = require('../db/migrate');

module.exports = async function globalSetup() {
  await runMigrations();
};
