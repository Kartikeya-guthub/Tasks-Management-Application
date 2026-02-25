'use strict';

const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ error: { message: 'Access token missing', code: 'UNAUTHORIZED' } });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: { message: 'Invalid or expired access token', code: 'UNAUTHORIZED' } });
    }

    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [payload.sub]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: { message: 'User not found', code: 'UNAUTHORIZED' } });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
