// /api/chats — the logged-in user's conversations and their message history.
// Chats are never created here: a chat appears when someone uses your invite
// (see inviteRoutes.js and the register route), so both people have agreed to it.
// SENDING messages happens over Socket.IO (src/socket), not REST.
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import { getChatReceipts, isChatMember, listMessages } from '../services/messages.js';
import { disconnectChat } from '../services/chats.js';
import { notifyChatUpdated } from '../socket/index.js';
import HttpError from '../utils/httpError.js';

const router = Router();

router.use(requireAuth);

// Shape of a chat as sent to the client.
function toPublicChat(row) {
  return {
    id: row.id,
    type: row.type,
    otherUser: row.other_id
      ? { id: row.other_id, username: row.other_username, displayName: row.other_display_name }
      : null,
    lastMessage: row.last_at
      ? { body: row.last_body, type: row.last_type, senderId: row.last_sender_id, createdAt: row.last_at }
      : null,
    unreadCount: row.unread_count,
    // Disconnected ("unfollowed") chats are read-only for both people.
    disconnected: row.disconnected_at
      ? { at: row.disconnected_at, byMe: row.disconnected_by === row.me_id }
      : null,
    createdAt: row.created_at,
  };
}

// GET /api/chats  — my chats, most recently active first.
// LATERAL joins run a small sub-query PER CHAT: "the other member", "the latest message",
// and "how many messages from others are newer than my read mark".
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.type, c.created_at, c.disconnected_at, c.disconnected_by, me.user_id AS me_id,
            other.id AS other_id, other.username AS other_username,
            other.display_name AS other_display_name,
            last.body AS last_body, last.type AS last_type,
            last.sender_id AS last_sender_id, last.created_at AS last_at,
            unread.count AS unread_count
       FROM chat_members me
       JOIN chats c ON c.id = me.chat_id
       LEFT JOIN LATERAL (
            SELECT u.id, u.username, u.display_name
              FROM chat_members m
              JOIN users u ON u.id = m.user_id
             WHERE m.chat_id = c.id AND m.user_id <> me.user_id
             LIMIT 1
       ) other ON true
       LEFT JOIN LATERAL (
            SELECT body, type, sender_id, created_at
              FROM messages
             WHERE chat_id = c.id
             ORDER BY id DESC
             LIMIT 1
       ) last ON true
       LEFT JOIN LATERAL (
            SELECT count(*)::int AS count
              FROM messages
             WHERE chat_id = c.id
               AND id > me.last_read_message_id
               AND sender_id IS DISTINCT FROM me.user_id
       ) unread ON true
      WHERE me.user_id = $1
      ORDER BY COALESCE(last.created_at, c.created_at) DESC`,
    [req.user.id],
  );

  res.json({ chats: rows.map(toPublicChat) });
});

const historyQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// Reads :chatId from the URL and checks the user is a member.
// Same 404 for "doesn't exist" and "not yours": don't reveal which chats exist.
async function memberChatId(req) {
  const chatId = z.uuid().safeParse(req.params.chatId);
  if (!chatId.success || !(await isChatMember(pool, chatId.data, req.user.id))) {
    throw new HttpError(404, 'Chat not found');
  }
  return chatId.data;
}

// GET /api/chats/:chatId/messages?before=<id>&limit=30  — paginated history.
// Also returns every member's delivered/read marks so the client can draw ticks.
router.get('/:chatId/messages', async (req, res) => {
  const chatId = await memberChatId(req);

  const query = historyQuerySchema.safeParse(req.query);
  if (!query.success) throw new HttpError(400, 'Invalid "before" or "limit"');

  const { messages, hasMore } = await listMessages(pool, chatId, query.data);
  const receipts = await getChatReceipts(pool, chatId);

  res.json({ messages, hasMore, receipts });
});

// POST /api/chats/:chatId/disconnect  — "unfollow": the chat becomes read-only for both.
// History stays. Either person can reconnect later by sending a new invite.
router.post('/:chatId/disconnect', async (req, res) => {
  const chatId = await memberChatId(req);

  const changed = await disconnectChat(pool, chatId, req.user.id);
  if (!changed) throw new HttpError(409, 'This chat is already disconnected');

  notifyChatUpdated(chatId); // both people's open tabs update live
  res.status(204).end();
});

export default router;
