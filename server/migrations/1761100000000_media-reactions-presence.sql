-- Up Migration

-- MEDIA: encrypted photo / video / voice files. The browser encrypts each file with its own
-- random key BEFORE upload; the key travels inside the (also encrypted) message.
-- The server only stores opaque bytes + who may download them (members of chat_id).
CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  size        BIGINT NOT NULL,
  storage_key TEXT NOT NULL,           -- where the bytes live (local path or Cloudinary public id)
  expires_at  TIMESTAMPTZ,             -- set when the chat has disappearing messages
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX media_chat_id_idx ON media (chat_id);
CREATE INDEX media_expires_at_idx ON media (expires_at) WHERE expires_at IS NOT NULL;

-- REACTIONS: one per person per message. The emoji itself is end-to-end encrypted too.
CREATE TABLE message_reactions (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,            -- e2ee:v1:… ciphertext of the emoji
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- "Delete for everyone": the ciphertext is wiped, a tombstone stays so both sides show
-- "This message was deleted". DISAPPEARING messages get an expiry time and are removed.
ALTER TABLE messages
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN expires_at TIMESTAMPTZ;
CREATE INDEX messages_expires_at_idx ON messages (expires_at) WHERE expires_at IS NOT NULL;

-- Per-chat disappearing-message timer in seconds (NULL = off).
ALTER TABLE chats ADD COLUMN disappear_seconds INTEGER;

-- PRESENCE: "last seen" time, updated when a user's last connection closes.
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;

-- WEB PUSH: one row per browser that allowed notifications.
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions (user_id);

-- Down Migration

DROP TABLE IF EXISTS push_subscriptions;
ALTER TABLE users DROP COLUMN IF EXISTS last_seen_at;
ALTER TABLE chats DROP COLUMN IF EXISTS disappear_seconds;
DROP INDEX IF EXISTS messages_expires_at_idx;
ALTER TABLE messages DROP COLUMN IF EXISTS expires_at, DROP COLUMN IF EXISTS deleted_at;
DROP TABLE IF EXISTS message_reactions;
DROP TABLE IF EXISTS media;
