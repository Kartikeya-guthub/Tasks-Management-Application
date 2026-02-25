-- Migration: 003_create_refresh_tokens
-- Stores hashed refresh tokens for refresh token rotation.
-- ON DELETE CASCADE ensures tokens are purged when the user is deleted.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash)
);

-- Index for fast per-user token lookup (e.g. logout-all)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id);
