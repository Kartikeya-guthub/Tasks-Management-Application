'use strict';

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp     = require('pino-http');

const logger    = require('./utils/logger');
const requestId = require('./middleware/requestId');

const app = express();

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));

// Attach X-Request-Id before anything else so every log line has it.
app.use(requestId);

// Structured HTTP request/response logging via pino.
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.requestId,
  customAttributeKeys: { reqId: 'requestId' },
  autoLogging: { ignore: (req) => req.url === '/healthz' },
  redact: { paths: ['req.headers.cookie', 'req.headers.authorization'], censor: '[REDACTED]' },
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
});

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const logFn  = status < 500 ? 'warn' : 'error';
  logger[logFn]({
    requestId: req.requestId,
    err: { message: err.message, code: err.code, stack: err.stack },
    msg: 'Request error',
  });
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      code:    err.code    || 'INTERNAL_ERROR',
    },
  });
});

module.exports = app;
