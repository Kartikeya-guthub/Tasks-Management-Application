'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');

const pool   = require('../db/pool');
const router = express.Router();

const isProd = () => process.env.NODE_ENV === 'production';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: { message: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' } });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, password_hash]
    );

    res.status(201).json({ message: 'User registered successfully', user: rows[0] });
  } catch (error) {
    // PostgreSQL unique violation on email
    if (error.code === '23505') {
      return res.status(409).json({ error: { message: 'Email already in use', code: 'CONFLICT' } });
    }
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } });
    }

    const { rows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } });
    }

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } });
    }

    const accessToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Store hashed refresh token in DB for rotation/revocation
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, hashToken(refreshToken)]
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure:   isProd(),
      sameSite: 'Strict',
      path:     '/',
      maxAge:   15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isProd(),
      sameSite: 'Strict',
      path:     '/api/auth/refresh',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: { message: 'No refresh token', code: 'UNAUTHORIZED' } });

    // Verify JWT signature and expiry
    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: { message: 'Invalid or expired refresh token', code: 'UNAUTHORIZED' } });
    }

    // Check token exists in DB (not revoked/rotated)
    const { rows } = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [hashToken(token)]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: { message: 'Refresh token revoked', code: 'UNAUTHORIZED' } });
    }

    // Rotate: delete old token, insert new one
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)]);

    const newAccessToken = jwt.sign(
      { sub: payload.sub },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { sub: payload.sub },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [payload.sub, hashToken(newRefreshToken)]
    );

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure:   isProd(),
      sameSite: 'Strict',
      path:     '/',
      maxAge:   15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure:   isProd(),
      sameSite: 'Strict',
      path:     '/api/auth/refresh',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Token refreshed' });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    // Revoke token in DB if present
    if (token) {
      await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)]);
    }

    res.clearCookie('accessToken',  { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// GET /api/auth/me — returns the logged-in user's profile
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

module.exports = router;
