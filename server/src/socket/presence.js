// PRESENCE: who is online. A user is online while they have at least one open socket
// (one per tab/device). We count connections per user in memory.
// (With several server instances this would move to Redis — see DEPLOY.md.)
import pool from '../db/pool.js';
import { getUserChatIds } from '../services/messages.js';
import { chatRoom } from './rooms.js';

const connectionCount = new Map(); // userId → number of open sockets

export function isOnline(userId) {
  return (connectionCount.get(userId) || 0) > 0;
}

// Tell everyone who shares a chat with this user that they came online / went offline.
async function broadcast(io, userId, online, lastSeenAt = null) {
  const chatIds = await getUserChatIds(pool, userId);
  for (const chatId of chatIds) {
    io.to(chatRoom(chatId)).emit('presence', { userId, online, lastSeenAt });
  }
}

export async function userConnected(io, userId) {
  const count = (connectionCount.get(userId) || 0) + 1;
  connectionCount.set(userId, count);
  if (count === 1) await broadcast(io, userId, true); // first tab opened → now online
}

export async function userDisconnected(io, userId) {
  const count = Math.max(0, (connectionCount.get(userId) || 0) - 1);
  if (count === 0) {
    connectionCount.delete(userId);
    const { rows } = await pool.query('UPDATE users SET last_seen_at = now() WHERE id = $1 RETURNING last_seen_at', [
      userId,
    ]);
    await broadcast(io, userId, false, rows[0]?.last_seen_at ?? null); // last tab closed → offline
  } else {
    connectionCount.set(userId, count);
  }
}

// Ids of people I share a chat with who are online right now.
export async function onlineContacts(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT other.user_id
       FROM chat_members me
       JOIN chat_members other ON other.chat_id = me.chat_id AND other.user_id <> me.user_id
      WHERE me.user_id = $1 AND me.removed_at IS NULL`,
    [userId],
  );
  return rows.map((row) => row.user_id).filter(isOnline);
}
