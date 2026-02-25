-- Migration: 002_create_tasks
-- Creates the task_status ENUM and tasks table with FK, constraints, and indexes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,                    -- stored encrypted at the application layer
  status      task_status NOT NULL DEFAULT 'todo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user-scoped pagination (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_user_created
  ON tasks (user_id, created_at DESC);

-- BTree index on title for keyword search / LIKE prefix queries
CREATE INDEX IF NOT EXISTS idx_tasks_title
  ON tasks USING btree (title);
