-- Up Migration

-- EMAIL: only used to send password-reset links. Stored lowercase.
-- Nullable so accounts created before this migration keep working (they can add one later).
-- A UNIQUE index allows many NULLs but no two accounts with the same email.
ALTER TABLE users ADD COLUMN email TEXT;
CREATE UNIQUE INDEX users_email_idx ON users (email);

-- PASSWORD RESET TOKENS: one-time, short-lived, stored hashed (like refresh tokens).
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

-- DISCONNECT ("unfollow"): the chat becomes read-only for both people.
-- History stays; a new invite between them clears these columns again.
ALTER TABLE chats
  ADD COLUMN disconnected_at TIMESTAMPTZ,
  ADD COLUMN disconnected_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Down Migration

ALTER TABLE chats DROP COLUMN IF EXISTS disconnected_by, DROP COLUMN IF EXISTS disconnected_at;
DROP TABLE IF EXISTS password_reset_tokens;
DROP INDEX IF EXISTS users_email_idx;
ALTER TABLE users DROP COLUMN IF EXISTS email;
