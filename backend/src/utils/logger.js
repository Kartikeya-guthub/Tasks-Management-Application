'use strict';

const pino = require('pino');

/**
 * Singleton structured logger.
 *
 * In development: pino-pretty formats logs for human readability.
 * In production : raw JSON lines — suitable for log aggregators.
 *
 * Sensitive fields are redacted before any log is written so passwords,
 * cookies, and tokens never appear in output.
 */
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',

    // Normalise the "level" field to a string label (e.g. "info" not 30).
    formatters: {
      level: (label) => ({ level: label }),
    },

    // ISO-8601 timestamps on every line.
    timestamp: pino.stdTimeFunctions.isoTime,

    // ── Redact sensitive paths — NEVER log secrets ─────────────────
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'body.password',
        'body.passwordHash',
        'body.token',
        'body.refreshToken',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.refreshToken',
      ],
      censor: '[REDACTED]',
    },

    // ── Human-readable format in development only ──────────────────
    ...(process.env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
    }),
  }
);

module.exports = logger;
