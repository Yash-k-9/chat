-- Up Migration

-- "Delete chat (for me)": each member can remove a chat from THEIR OWN list.
--   removed_at        set → the chat is hidden for this member (and the chat is disconnected)
--   cleared_before_id messages with id <= this are hidden for this member forever, so if the
--                     two people reconnect later with a new invite, the remover starts empty.
-- The other person's copy is untouched.
ALTER TABLE chat_members
  ADD COLUMN removed_at TIMESTAMPTZ,
  ADD COLUMN cleared_before_id BIGINT NOT NULL DEFAULT 0;

-- Down Migration

ALTER TABLE chat_members
  DROP COLUMN IF EXISTS cleared_before_id,
  DROP COLUMN IF EXISTS removed_at;
