'use strict';

const express = require('express');
const router  = express.Router();

// GET /api/health
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
