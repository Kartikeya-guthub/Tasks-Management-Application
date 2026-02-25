'use strict';

const express        = require('express');
const pool           = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();

// All task routes require authentication
router.use(authMiddleware);

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const VALID_STATUSES = ['todo', 'in_progress', 'done'];
    const { title, description, status = 'todo' } = req.body;

    if (!title) {
      return res.status(400).json({ error: { message: 'Title is required', code: 'VALIDATION_ERROR' } });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: { message: 'Status must be todo, in_progress, or done', code: 'VALIDATION_ERROR' } });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (user_id, title, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, status, created_at, updated_at`,
      [req.user.id, title, encrypt(description || null), status]
    );

    const task = { ...rows[0], description: decrypt(rows[0].description) };
    res.status(201).json({ task });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// GET /api/tasks?status=todo&search=fix&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 20;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    // Build dynamic WHERE conditions
    const params = [req.user.id];
    const conditions = ['user_id = $1'];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');

    // Run total count and paginated rows in parallel
    const countParams = [...params];
    const dataParams  = [...params, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM tasks WHERE ${where}`, countParams),
      pool.query(
        `SELECT id, title, description, status, created_at, updated_at
         FROM tasks
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      ),
    ]);

    const total = parseInt(countResult.rows[0].count);

    const tasks = dataResult.rows.map((t) => ({ ...t, description: decrypt(t.description) }));

    res.status(200).json({
      tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, status, created_at, updated_at
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found', code: 'NOT_FOUND' } });
    }

    const task = { ...rows[0], description: decrypt(rows[0].description) };
    res.status(200).json({ task });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    // First verify ownership
    const existing = await pool.query(
      'SELECT id, user_id FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found', code: 'NOT_FOUND' } });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    }

    const VALID_STATUSES = ['todo', 'in_progress', 'done'];
    const { title, description, status } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: { message: 'Status must be todo, in_progress, or done', code: 'VALIDATION_ERROR' } });
    }

    const { rows } = await pool.query(
      `UPDATE tasks
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status),
           updated_at  = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, title, description, status, created_at, updated_at`,
      [title || null, description ? encrypt(description) : null, status || null, req.params.id, req.user.id]
    );

    const task = { ...rows[0], description: decrypt(rows[0].description) };
    res.status(200).json({ task });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    // First verify ownership
    const existing = await pool.query(
      'SELECT id, user_id FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found', code: 'NOT_FOUND' } });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: { message: error.message, code: 'BAD_REQUEST' } });
  }
});

module.exports = router;
