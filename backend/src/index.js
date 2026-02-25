'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const logger = require('./utils/logger');
const app    = require('./app');

const PORT = process.env.PORT || 5000;

// ── Server startup ────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
});

// ── Process-level safety nets ─────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason, msg: 'Unhandled promise rejection' });
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err, msg: 'Uncaught exception — shutting down' });
  process.exit(1);
});

