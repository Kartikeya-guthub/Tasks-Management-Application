'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body } = require('express-validator');

const pool     = require('../db/pool');
const validate = require('../middleware/validate');

const router = express.Router();

const SALT_ROUNDS    = 12;
const ACCESS_EXPIRY  = '15m';
const REFRESH_EXPIRY = '7d';
const ACCESS_MAX_AGE  = 15 * 60;          // seconds → 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // seconds → 7 days

// ── Cookie options ────────────────────────────────────────────────
const baseCookieOpts = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  path:     '/',
};

function issueTokens(res, userId) {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { sub: userId },
    process.env.REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

  res.cookie('accessToken', accessToken, {
    ...baseCookieOpts,
    maxAge: ACCESS_MAX_AGE * 1000, // cookie maxAge is ms
  });

  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOpts,
    maxAge: REFRESH_MAX_AGE * 1000,
    path:   '/api/auth/refresh', // scope refresh cookie to refresh endpoint only
  });

  return { accessToken, refreshToken };
}

// ── POST /api/auth/register ───────────────────────────────────────
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Check for existing user
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, password_hash]
      );

      return res.status(201).json({ user: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const { rows } = await pool.query(
        'SELECT id, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        // Use same message as wrong password to avoid user enumeration
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      issueTokens(res, user.id);

      return res.status(200).json({ message: 'Login successful' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
