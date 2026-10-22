// Database helpers for messages, receipts, reactions and expiry.
// Used by both the REST routes (history) and the Socket.IO handlers (live chat).
import { storage } from './mediaStorage.js';

// Messages arrive ENCRYPTED: "e2ee:v1:<nonce>:<ciphertext>" (URL-safe base64).
// The browser limits the plain text to 4000 characters; as UTF-8 that's at most
// 16000 bytes, which base64 turns into ~21400 characters plus the prefix and nonce.
// Media messages carry a small JSON (file key, size, a tiny preview image), up to ~20 KB.
export const MAX_MESSAGE_LENGTH = 48000;
export const ENCRYPTED_BODY = /^e2ee:v1:[A-Za-z0-9_-]{32}:[A-Za-z0-9_-]+$/; // 24-byte nonce = 32 base64 chars

// PostgreSQL returns BIGINT as a string (it can exceed JS numbers). Our ids are far below
// 2^53, so converting to Number is safe and makes comparisons in the browser easy.
export function toPublicMessage(row) {
  return {
    id: Number(row.id),
    chatId: row.chat_id,
    senderId: row.sender_id,
    clientId: row.client_id,
    type: row.type,
    body: row.deleted_at ? null : row.body,
    deleted: Boolean(row.deleted_at),
    expiresAt: row.expires_at,
    // [{ userId, body }] — each body is an encrypted emoji
    reactions: row.reactions ?? [],
    createdAt: row.created_at,
  };
}

function toPublicReceipt(row) {
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    lastDeliveredId: Number(row.last_delivered_message_id),
    lastReadId: Number(row.last_read_message_id),
  };
}

// "Member" = in the chat AND hasn't removed it from their own list.
export async function isChatMember(db, chatId, userId) {
  return Boolean(await getMembership(db, chatId, userId));
}

// → { clearedBeforeId } for an active member, or null (not a member / removed the chat).
// Messages with id <= clearedBeforeId are hidden for this member (history before a removal).
export async function getMembership(db, chatId, userId) {
  const { rows } = await db.query(
    'SELECT cleared_before_id FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND removed_at IS NULL',
    [chatId, userId],
  );
  return rows[0] ? { clearedBeforeId: Number(rows[0].cleared_before_id) } : null;
}

export async function getUserChatIds(db, userId) {
  const { rows } = await db.query('SELECT chat_id FROM chat_members WHERE user_id = $1 AND removed_at IS NULL', [userId]);
  return rows.map((row) => row.chat_id);
}

// Saves a message. If this sender already sent this clientId (a retry), returns the
// existing message instead, with created = false so it isn't broadcast twice.
// Chats with disappearing messages get an expiry time from the chat's setting.
export async function saveMessage(db, { chatId, senderId, clientId, type, body }) {
  const inserted = await db.query(
    `INSERT INTO messages (chat_id, sender_id, client_id, type, body, expires_at)
     SELECT $1, $2, $3, $4, $5,
            CASE WHEN c.disappear_seconds IS NULL THEN NULL
                 ELSE now() + make_interval(secs => c.disappear_seconds) END
       FROM chats c WHERE c.id = $1
     ON CONFLICT (sender_id, client_id) DO NOTHING
     RETURNING *`,
    [chatId, senderId, clientId, type, body],
  );
  if (inserted.rows[0]) return { message: toPublicMessage(inserted.rows[0]), created: true };

  const existing = await db.query('SELECT * FROM messages WHERE sender_id = $1 AND client_id = $2', [senderId, clientId]);
  return { message: toPublicMessage(existing.rows[0]), created: false };
}

// One page of history, newest first in the query, returned oldest → newest.
// "before" = the oldest message id the client already has (cursor pagination).
// Expired (disappeared) messages are never returned, even before the cleanup job runs.
// afterId: hide everything up to this id (history the reader removed for themselves).
export async function listMessages(db, chatId, { before = null, limit = 30, afterId = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT m.*,
            (SELECT json_agg(json_build_object('userId', r.user_id, 'body', r.body) ORDER BY r.created_at)
               FROM message_reactions r WHERE r.message_id = m.id) AS reactions
       FROM messages m
      WHERE m.chat_id = $1
        AND ($2::bigint IS NULL OR m.id < $2)
        AND m.id > $4
        AND (m.expires_at IS NULL OR m.expires_at > now())
      ORDER BY m.id DESC
      LIMIT $3`,
    [chatId, before, limit + 1, afterId], // ask for one extra row to know if there are more
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  return { messages: page.map(toPublicMessage), hasMore };
}

export async function getChatReceipts(db, chatId) {
  const { rows } = await db.query(
    `SELECT chat_id, user_id, last_delivered_message_id, last_read_message_id
       FROM chat_members WHERE chat_id = $1`,
    [chatId],
  );
  return rows.map(toPublicReceipt);
}

// Moves a member's delivered (and optionally read) mark forward. Never backwards
// (GREATEST), and never past the newest real message (LEAST), so a client can't
// mark messages that don't exist yet. Returns the receipt, or null if nothing changed.
export async function advanceReceipt(db, { chatId, userId, messageId, read }) {
  const { rows } = await db.query(
    `WITH newest AS (
       SELECT COALESCE(max(id), 0) AS id FROM messages WHERE chat_id = $1
     ),
     target AS (
       SELECT LEAST($3::bigint, newest.id) AS id FROM newest
     )
     UPDATE chat_members cm
        SET last_delivered_message_id = GREATEST(cm.last_delivered_message_id, target.id),
            last_read_message_id = CASE WHEN $4::boolean
                                        THEN GREATEST(cm.last_read_message_id, target.id)
                                        ELSE cm.last_read_message_id END
       FROM target
      WHERE cm.chat_id = $1 AND cm.user_id = $2
        AND (cm.last_delivered_message_id < target.id
             OR ($4::boolean AND cm.last_read_message_id < target.id))
      RETURNING cm.chat_id, cm.user_id, cm.last_delivered_message_id, cm.last_read_message_id`,
    [chatId, userId, messageId, read],
  );
  return rows[0] ? toPublicReceipt(rows[0]) : null;
}

// When a user comes online: everything already stored for them is now "delivered".
// This is OFFLINE DELIVERY: messages waited in the database while they were away.
export async function markAllDelivered(db, userId) {
  const { rows } = await db.query(
    `UPDATE chat_members cm
        SET last_delivered_message_id = newest.id
       FROM (SELECT chat_id, max(id) AS id FROM messages GROUP BY chat_id) newest
      WHERE cm.user_id = $1
        AND cm.chat_id = newest.chat_id
        AND cm.last_delivered_message_id < newest.id
      RETURNING cm.chat_id, cm.user_id, cm.last_delivered_message_id, cm.last_read_message_id`,
    [userId],
  );
  return rows.map(toPublicReceipt);
}

// "Delete for everyone": only the sender can, and the ciphertext is wiped from the database.
// Returns true if a message was deleted.
export async function deleteMessage(db, { chatId, messageId, userId }) {
  const { rowCount } = await db.query(
    `UPDATE messages SET body = '', deleted_at = now()
      WHERE id = $1 AND chat_id = $2 AND sender_id = $3 AND deleted_at IS NULL`,
    [messageId, chatId, userId],
  );
  if (rowCount) await db.query('DELETE FROM message_reactions WHERE message_id = $1', [messageId]);
  return rowCount > 0;
}

// Set (body = encrypted emoji) or remove (body = null) MY reaction on a message.
// Returns false if the message isn't in this chat (or was deleted).
export async function setReaction(db, { chatId, messageId, userId, body }) {
  const { rows } = await db.query(
    'SELECT 1 FROM messages WHERE id = $1 AND chat_id = $2 AND deleted_at IS NULL',
    [messageId, chatId],
  );
  if (!rows[0]) return false;

  if (body) {
    await db.query(
      `INSERT INTO message_reactions (message_id, user_id, body) VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id) DO UPDATE SET body = EXCLUDED.body, created_at = now()`,
      [messageId, userId, body],
    );
  } else {
    await db.query('DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2', [messageId, userId]);
  }
  return true;
}

// Background job: permanently remove disappeared messages and expired media files.
export async function cleanupExpired(db) {
  const messages = await db.query('DELETE FROM messages WHERE expires_at <= now()');
  const media = await db.query('DELETE FROM media WHERE expires_at <= now() RETURNING storage_key');
  for (const row of media.rows) {
    if (row.storage_key) await storage.remove(row.storage_key).catch(() => {});
  }
  return { messages: messages.rowCount, media: media.rowCount };
}
