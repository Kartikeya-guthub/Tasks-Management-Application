'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[backend] Server running on http://localhost:${PORT}`);
});
