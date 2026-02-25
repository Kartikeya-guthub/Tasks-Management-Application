'use strict';

/**
 * Runs in the same Node.js process as each Jest test file (setupFiles),
 * BEFORE any module under test is loaded.  This ensures that when pool.js
 * initialises pg.Pool it reads the test DATABASE_URL, not the dev one.
 */
const path = require('path');
require('dotenv').config({
  path:     path.join(__dirname, '../../../.env.test'),
  override: true,   // override any values already in process.env
});
