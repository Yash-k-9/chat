-- Up Migration

-- USERS: one row per person. Usernames are stored lowercase (validated in the API).
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,                 -- argon2id hash, never the password itself
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INVITES: one-time codes. We store only a SHA-256 hash of the code,
-- so a leaked database does not leak usable invite codes.
CREATE TABLE invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash   TEXT NOT NULL UNIQUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = created from the CLI
  used_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,                                   -- NULL = still unused
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- REFRESH TOKENS: long-lived login sessions (one row per device/browser).
-- Stored hashed; revoked_at lets us log out a single session or all of them.
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

-- CHATS: a conversation. 'direct' = 1-to-1 now, 'group' = small groups later.
CREATE TABLE chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name        TEXT,                                          -- only used by groups
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHAT_MEMBERS: who is in which chat (many-to-many between users and chats).
CREATE TABLE chat_members (
  chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
-- "Which chats is this user in?" is the chat-list query, so index user_id.
CREATE INDEX chat_members_user_id_idx ON chat_members (user_id);

-- MESSAGES: from Phase 4 on, body holds ciphertext only. The server never reads it.
-- A growing integer id makes "load older messages" pagination simple and fast.
CREATE TABLE messages (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'location')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Newest-first history of one chat.
CREATE INDEX messages_chat_id_id_idx ON messages (chat_id, id DESC);

-- Down Migration

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS users;
