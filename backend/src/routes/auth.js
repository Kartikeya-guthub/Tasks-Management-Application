'use strict';

const express = require('express');
const router  = express.Router();

// POST /api/auth/register   — placeholder
router.post('/register', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/auth/login      — placeholder
router.post('/login', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
