// /api/chats — the logged-in user's conversations, their history and settings.
// Chats are never created here: a chat appears when someone uses your invite
// (see inviteRoutes.js and the register route), so both people have agreed to it.
// SENDING messages happens over Socket.IO (src/socket), not REST.
import { Router } from 'express';
import { z } from 'zod';
import pool, { withTransaction } from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import validate from '../middleware/validate.js';
import { getChatReceipts, getMembership, listMessages } from '../services/messages.js';
import { disconnectChat, removeChatForMember } from '../services/chats.js';
import { notifyChatUpdated, removeUserFromChatRoom } from '../socket/index.js';
import HttpError from '../utils/httpError.js';

const router = Router();

router.use(requireAuth);

// Shape of a chat as sent to the client.
function toPublicChat(row) {
  return {
    id: row.id,
    type: row.type,
    otherUser: row.other_id
      ? {
          id: row.other_id,
          username: row.other_username,
          displayName: row.other_display_name,
          publicKey: row.other_public_key, // null until they've set up encryption
          lastSeenAt: row.other_last_seen_at,
        }
      : null,
    lastMessage: row.last_at
      ? {
          body: row.last_deleted ? null : row.last_body,
          deleted: row.last_deleted,
          type: row.last_type,
          senderId: row.last_sender_id,
          createdAt: row.last_at,
        }
      : null,
    unreadCount: row.unread_count,
    // Disconnected ("unfollowed") chats are read-only for both people.
    disconnected: row.disconnected_at ? { at: row.disconnected_at, byMe: row.disconnected_by === row.me_id } : null,
    // Disappearing messages timer in seconds (null = off).
    disappearSeconds: row.disappear_seconds,
    createdAt: row.created_at,
  };
}

// GET /api/chats  — my chats, most recently active first.
// LATERAL joins run a small sub-query PER CHAT: "the other member", "the latest message",
// and "how many messages from others are newer than my read mark".
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.type, c.created_at, c.disconnected_at, c.disconnected_by, c.disappear_seconds,
            me.user_id AS me_id,
            other.id AS other_id, other.username AS other_username,
            other.display_name AS other_display_name, other.public_key AS other_public_key,
            other.last_seen_at AS other_last_seen_at,
            last.body AS last_body, last.type AS last_type, last.deleted_at IS NOT NULL AS last_deleted,
            last.sender_id AS last_sender_id, last.created_at AS last_at,
            unread.count AS unread_count
       FROM chat_members me
       JOIN chats c ON c.id = me.chat_id
       LEFT JOIN LATERAL (
            SELECT u.id, u.username, u.display_name, u.public_key, u.last_seen_at
              FROM chat_members m
              JOIN users u ON u.id = m.user_id
             WHERE m.chat_id = c.id AND m.user_id <> me.user_id
             LIMIT 1
       ) other ON true
       LEFT JOIN LATERAL (
            SELECT body, type, sender_id, created_at, deleted_at
              FROM messages
             WHERE chat_id = c.id AND id > me.cleared_before_id
               AND (expires_at IS NULL OR expires_at > now())
             ORDER BY id DESC
             LIMIT 1
       ) last ON true
       LEFT JOIN LATERAL (
            SELECT count(*)::int AS count
              FROM messages
             WHERE chat_id = c.id
               AND id > GREATEST(me.last_read_message_id, me.cleared_before_id)
               AND sender_id IS DISTINCT FROM me.user_id
               AND deleted_at IS NULL
               AND (expires_at IS NULL OR expires_at > now())
       ) unread ON true
      WHERE me.user_id = $1
        AND me.removed_at IS NULL  -- chats I deleted from my list are hidden
      ORDER BY COALESCE(last.created_at, c.created_at) DESC`,
    [req.user.id],
  );

  res.json({ chats: rows.map(toPublicChat) });
});

const historyQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// Reads :chatId from the URL and checks the user is an active member (not removed).
// Same 404 for "doesn't exist" and "not yours": don't reveal which chats exist.
async function memberChat(req) {
  const chatId = z.uuid().safeParse(req.params.chatId);
  const membership = chatId.success && (await getMembership(pool, chatId.data, req.user.id));
  if (!membership) throw new HttpError(404, 'Chat not found');
  return { chatId: chatId.data, ...membership };
}
const memberChatId = async (req) => (await memberChat(req)).chatId;

// GET /api/chats/:chatId/messages?before=<id>&limit=30  — paginated history.
// Also returns every member's delivered/read marks so the client can draw ticks.
router.get('/:chatId/messages', async (req, res) => {
  const { chatId, clearedBeforeId } = await memberChat(req);

  const query = historyQuerySchema.safeParse(req.query);
  if (!query.success) throw new HttpError(400, 'Invalid "before" or "limit"');

  // History from before I once removed this chat stays hidden for me.
  const { messages, hasMore } = await listMessages(pool, chatId, { ...query.data, afterId: clearedBeforeId });
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

// DELETE /api/chats/:chatId  — "Delete chat" FOR ME ONLY.
// The chat and its history vanish from my list; it's also disconnected so nobody can keep
// messaging. The other person keeps their copy (shown as disconnected).
router.delete('/:chatId', async (req, res) => {
  const chatId = await memberChatId(req);
  await withTransaction((db) => removeChatForMember(db, chatId, req.user.id));

  // My open tabs leave the chat's live room; then everyone still in it hears about the change.
  removeUserFromChatRoom(req.user.id, chatId);
  notifyChatUpdated(chatId);
  res.status(204).end();
});

// PUT /api/chats/:chatId/disappearing  { seconds: null | 3600 | 86400 | 604800 }
// New messages in the chat are deleted automatically after this time (for both people).
const DISAPPEAR_OPTIONS = [3600, 86400, 604800];
const disappearSchema = z.object({
  seconds: z.union([z.null(), z.literal(DISAPPEAR_OPTIONS[0]), z.literal(DISAPPEAR_OPTIONS[1]), z.literal(DISAPPEAR_OPTIONS[2])]),
});

router.put('/:chatId/disappearing', validate(disappearSchema), async (req, res) => {
  const chatId = await memberChatId(req);
  await pool.query('UPDATE chats SET disappear_seconds = $1 WHERE id = $2', [req.body.seconds, chatId]);
  notifyChatUpdated(chatId);
  res.json({ disappearSeconds: req.body.seconds });
});

export default router;
