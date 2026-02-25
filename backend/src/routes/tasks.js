'use strict';

const express = require('express');
const router  = express.Router();

// GET  /api/tasks      — placeholder
router.get('/', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/tasks      — placeholder
router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

// PATCH /api/tasks/:id — placeholder
router.patch('/:id', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

// DELETE /api/tasks/:id — placeholder
router.delete('/:id', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
