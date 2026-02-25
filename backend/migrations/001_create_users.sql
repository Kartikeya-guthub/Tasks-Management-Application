-- Migration: 001_create_users
-- Creates the users table with unique email constraint and index.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

-- Explicit unique index on email (for fast lookup / uniqueness enforcement)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
