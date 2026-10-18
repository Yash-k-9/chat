-- Up Migration

-- Delivered/seen ticks. Instead of one row per message per reader, each member keeps two
-- "high-water marks": the newest message id they have RECEIVED and the newest they have READ.
-- Message ids only grow, so "message 41 is seen" just means "41 <= last_read_message_id".
ALTER TABLE chat_members
  ADD COLUMN last_delivered_message_id BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN last_read_message_id      BIGINT NOT NULL DEFAULT 0;

-- client_id: a random id the BROWSER gives each message before sending it.
-- If the network drops and the browser sends the same message again, the unique index
-- makes the second insert a no-op instead of a duplicate message ("idempotency").
ALTER TABLE messages ADD COLUMN client_id UUID;
CREATE UNIQUE INDEX messages_sender_client_id_idx ON messages (sender_id, client_id);

-- Down Migration

DROP INDEX IF EXISTS messages_sender_client_id_idx;
ALTER TABLE messages DROP COLUMN IF EXISTS client_id;
ALTER TABLE chat_members
  DROP COLUMN IF EXISTS last_delivered_message_id,
  DROP COLUMN IF EXISTS last_read_message_id;
