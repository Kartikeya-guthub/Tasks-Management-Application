'use strict';

const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const logger = require('../utils/logger');

async function authMiddleware(req, res, next) {
  // req.log is a pino-http child logger — already bound to this request's ID.
  const log = req.log || logger;

  try {
    const token = req.cookies.accessToken;
    if (!token) {
      log.warn({ requestId: req.requestId, msg: 'Auth failed: access token missing' });
      return res.status(401).json({ error: { message: 'Access token missing', code: 'UNAUTHORIZED' } });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      log.warn({ requestId: req.requestId, reason: jwtErr.message, msg: 'Auth failed: invalid token' });
      return res.status(401).json({ error: { message: 'Invalid or expired access token', code: 'UNAUTHORIZED' } });
    }

    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [payload.sub]
    );

    if (rows.length === 0) {
      log.warn({ requestId: req.requestId, userId: payload.sub, msg: 'Auth failed: user not found' });
      return res.status(401).json({ error: { message: 'User not found', code: 'UNAUTHORIZED' } });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
