// Chat helpers shared by several routes.

// Returns the id of the 1-to-1 chat between two users, creating it if needed.
// If they had DISCONNECTED, using a new invite reconnects the same chat (history kept).
// Must run inside a transaction (the lock is released when the transaction ends).
export async function findOrCreateDirectChat(db, userA, userB) {
  // Lock on this PAIR of users, so two requests at the same moment can't create two chats.
  const pairKey = [userA, userB].sort().join(':');
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [pairKey]);

  const existing = await db.query(
    `SELECT c.id
       FROM chats c
       JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
       JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
      WHERE c.type = 'direct'
      LIMIT 1`,
    [userA, userB],
  );
  if (existing.rows[0]) {
    const chatId = existing.rows[0].id;
    await db.query(
      'UPDATE chats SET disconnected_at = NULL, disconnected_by = NULL WHERE id = $1 AND disconnected_at IS NOT NULL',
      [chatId],
    );
    return chatId;
  }

  const { rows } = await db.query("INSERT INTO chats (type) VALUES ('direct') RETURNING id");
  const chatId = rows[0].id;
  await db.query(
    'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
    [chatId, userA, userB],
  );
  return chatId;
}

// Disconnected chats are read-only: no new messages or typing from either side.
export async function isChatDisconnected(db, chatId) {
  const { rows } = await db.query('SELECT disconnected_at FROM chats WHERE id = $1', [chatId]);
  return Boolean(rows[0]?.disconnected_at);
}

// "Unfollow": mark a direct chat as disconnected. Returns false if it already was.
export async function disconnectChat(db, chatId, userId) {
  const { rowCount } = await db.query(
    `UPDATE chats SET disconnected_at = now(), disconnected_by = $2
      WHERE id = $1 AND type = 'direct' AND disconnected_at IS NULL`,
    [chatId, userId],
  );
  return rowCount > 0;
}
