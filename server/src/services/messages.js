// Database helpers for messages and delivered/seen receipts.
// Used by both the REST routes (history) and the Socket.IO handlers (live chat).

// Messages arrive ENCRYPTED: "e2ee:v1:<nonce>:<ciphertext>" (URL-safe base64).
// The browser limits the plain text to 4000 characters; as UTF-8 that's at most
// 16000 bytes, which base64 turns into ~21400 characters plus the prefix and nonce.
export const MAX_MESSAGE_LENGTH = 24000;
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
    body: row.body,
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

export async function isChatMember(db, chatId, userId) {
  const { rows } = await db.query(
    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId],
  );
  return rows.length > 0;
}

export async function getUserChatIds(db, userId) {
  const { rows } = await db.query('SELECT chat_id FROM chat_members WHERE user_id = $1', [userId]);
  return rows.map((row) => row.chat_id);
}

// Saves a message. If this sender already sent this clientId (a retry), returns the
// existing message instead, with created = false so it isn't broadcast twice.
export async function saveMessage(db, { chatId, senderId, clientId, type, body }) {
  const inserted = await db.query(
    `INSERT INTO messages (chat_id, sender_id, client_id, type, body)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (sender_id, client_id) DO NOTHING
     RETURNING *`,
    [chatId, senderId, clientId, type, body],
  );
  if (inserted.rows[0]) return { message: toPublicMessage(inserted.rows[0]), created: true };

  const existing = await db.query(
    'SELECT * FROM messages WHERE sender_id = $1 AND client_id = $2',
    [senderId, clientId],
  );
  return { message: toPublicMessage(existing.rows[0]), created: false };
}

// One page of history, newest first in the query, returned oldest â†’ newest.
// "before" = the oldest message id the client already has (cursor pagination).
export async function listMessages(db, chatId, { before = null, limit = 30 } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM messages
      WHERE chat_id = $1 AND ($2::bigint IS NULL OR id < $2)
      ORDER BY id DESC
      LIMIT $3`,
    [chatId, before, limit + 1], // ask for one extra row to know if there are more
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
