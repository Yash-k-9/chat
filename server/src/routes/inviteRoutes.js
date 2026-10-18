// /api/invites — invite links that connect people.
//   POST /api/invites         → any member creates a one-time invite
//   POST /api/invites/accept  → a logged-in member uses someone's invite → chat with the inviter
// (New people use the invite on the signup page instead: POST /api/auth/register.)
import { Router } from 'express';
import { z } from 'zod';
import pool, { withTransaction } from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import validate from '../middleware/validate.js';
import { inviteLimiter } from '../middleware/rateLimiters.js';
import { createInviteSchema } from '../validation/authSchemas.js';
import { countActiveInvites, consumeInvite, createInvite, markInviteUsedBy } from '../services/invites.js';
import { findOrCreateDirectChat } from '../services/chats.js';
import { notifyNewChat } from '../socket/index.js';
import HttpError from '../utils/httpError.js';

const router = Router();

router.use(requireAuth);

// Stops one account from flooding the database with unused invites.
const MAX_ACTIVE_INVITES = 10;

const acceptInviteSchema = z.object({
  code: z.string().trim().min(1, 'Invite code is required').max(64),
});

// POST /api/invites  { days?: 1–30 }  → { code, expiresAt }
router.post('/', validate(createInviteSchema), async (req, res) => {
  if ((await countActiveInvites(pool, req.user.id)) >= MAX_ACTIVE_INVITES) {
    throw new HttpError(429, `You already have ${MAX_ACTIVE_INVITES} unused invites. Wait for them to be used or expire.`);
  }

  const invite = await createInvite(pool, { createdBy: req.user.id, days: req.body.days });
  res.status(201).json(invite);
});

// POST /api/invites/accept  { code }  → { chat }
router.post('/accept', inviteLimiter, validate(acceptInviteSchema), async (req, res) => {
  const myId = req.user.id;

  const chat = await withTransaction(async (db) => {
    const invite = await consumeInvite(db, req.body.code);
    if (!invite) throw new HttpError(400, 'Invalid or expired invite code');

    // Throwing here rolls back the transaction, so the invite stays unused.
    if (!invite.createdBy) throw new HttpError(400, 'This invite is only for creating an account');
    if (invite.createdBy === myId) throw new HttpError(400, "That's your own invite — share it with someone else");

    await markInviteUsedBy(db, invite.id, myId);
    const chatId = await findOrCreateDirectChat(db, invite.createdBy, myId);

    const { rows } = await db.query(
      'SELECT id, username, display_name FROM users WHERE id = $1',
      [invite.createdBy],
    );
    const inviter = rows[0];
    return {
      id: chatId,
      type: 'direct',
      otherUser: { id: inviter.id, username: inviter.username, displayName: inviter.display_name },
      lastMessage: null,
      unreadCount: 0,
    };
  });

  // After COMMIT: put both people's open tabs in the new chat room, live.
  notifyNewChat(chat.id, [chat.otherUser.id, myId]);
  res.json({ chat });
});

export default router;
