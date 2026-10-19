// /api/auth/* — register, login, refresh, logout, forgot/reset password.
// Express 5 catches errors thrown in async handlers and sends them to the error handler.
import { Router } from 'express';
import argon2 from 'argon2';
import pool, { withTransaction } from '../db/pool.js';
import validate from '../middleware/validate.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiters.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation/authSchemas.js';
import { requestPasswordReset, resetPassword } from '../services/passwordReset.js';
import { explainMailError } from '../services/mailer.js';
import { consumeInvite, markInviteUsedBy } from '../services/invites.js';
import { findOrCreateDirectChat } from '../services/chats.js';
import { notifyNewChat } from '../socket/index.js';
import {
  signAccessToken,
  issueRefreshToken,
  sha256,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../utils/tokens.js';
import HttpError from '../utils/httpError.js';

const router = Router();

// Used when a username doesn't exist, so a failed login takes the same time either way.
// Otherwise an attacker could time responses to discover which usernames exist.
const DUMMY_PASSWORD_HASH = await argon2.hash('dummy-password-for-timing');

// Shape of a user as sent to the client (never include password_hash!).
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    email: row.email, // only ever sent to the user themselves
  };
}

// Common ending of register/login/refresh: set the cookie, return user + access token.
function sendSession(res, status, user, refreshToken, extra = {}) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(status).json({ user: toPublicUser(user), accessToken: signAccessToken(user), ...extra });
}

function clearRefreshCookie(res) {
  const { maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

// POST /api/auth/register  { inviteCode, username, displayName, email, password }
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { inviteCode, username, displayName, email, password } = req.body;

  // Hash BEFORE opening the transaction: hashing is deliberately slow (~50–100 ms).
  const passwordHash = await argon2.hash(password); // argon2id with safe defaults

  const { user, refreshToken, chatId, inviterId } = await withTransaction(async (db) => {
    const invite = await consumeInvite(db, inviteCode);
    if (!invite) throw new HttpError(400, 'Invalid or expired invite code');

    let user;
    try {
      // The very first user becomes the admin.
      const { rows } = await db.query(
        `INSERT INTO users (username, display_name, email, password_hash, is_admin)
         VALUES ($1, $2, $3, $4, NOT EXISTS (SELECT 1 FROM users))
         RETURNING *`,
        [username, displayName, email, passwordHash],
      );
      user = rows[0];
    } catch (err) {
      // 23505 = unique_violation. The transaction rolls back, so the invite stays unused.
      if (err.code === '23505') {
        throw new HttpError(
          409,
          err.constraint === 'users_email_idx' ? 'That email is already used by another account' : 'Username is already taken',
        );
      }
      throw err;
    }

    await markInviteUsedBy(db, invite.id, user.id);

    // Invited by a member → start a chat between the new user and the inviter.
    // (Invites made with `npm run invite` have no inviter, so no chat.)
    const chatId = invite.createdBy
      ? await findOrCreateDirectChat(db, invite.createdBy, user.id)
      : null;

    const refreshToken = await issueRefreshToken(db, user.id);
    return { user, refreshToken, chatId, inviterId: invite.createdBy };
  });

  // Tell the inviter's open tabs about the new chat (the new user has no socket yet).
  if (chatId) notifyNewChat(chatId, [inviterId]);

  sendSession(res, 201, user, refreshToken, { chatId });
});

// POST /api/auth/login  { username, password }
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];

  const passwordOk = await argon2.verify(user?.password_hash ?? DUMMY_PASSWORD_HASH, password);

  // Same message for "no such user" and "wrong password": don't reveal which.
  if (!user || !passwordOk) throw new HttpError(401, 'Invalid username or password');

  const refreshToken = await issueRefreshToken(pool, user.id);
  sendSession(res, 200, user, refreshToken);
});

// POST /api/auth/refresh  (no body; uses the httpOnly cookie)
// ROTATION: every refresh token works once. Using it gives you a brand-new one.
// If an already-used token shows up again, it was probably stolen, so we log out
// every session of that user.
router.post('/refresh', async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) throw new HttpError(401, 'No refresh token');

  const result = await withTransaction(async (db) => {
    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
      [sha256(token)],
    );
    const stored = rows[0];

    if (!stored) return { error: 'Invalid refresh token' };

    if (stored.revoked_at) {
      // Reuse detected: revoke ALL of this user's sessions.
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [stored.user_id],
      );
      return { error: 'Refresh token reuse detected, please log in again' };
    }

    if (stored.expires_at < new Date()) return { error: 'Refresh token expired' };

    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [stored.id]);
    const newToken = await issueRefreshToken(db, stored.user_id);
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [stored.user_id]);
    return { user: userResult.rows[0], refreshToken: newToken };
  });

  // Errors are returned (not thrown) so the reuse-revocation above is COMMITTED.
  if (result.error) {
    clearRefreshCookie(res);
    throw new HttpError(401, result.error);
  }

  sendSession(res, 200, result.user, result.refreshToken);
});

// POST /api/auth/forgot-password  { email }
// ALWAYS answers the same way, whether or not the email exists, so nobody can use this
// to find out who has an account. The email is sent in the background for the same
// reason: waiting for it would make "exists" responses measurably slower.
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res) => {
  requestPasswordReset(pool, req.body.email).catch((err) =>
    console.error(`📧 Password reset email FAILED: ${explainMailError(err)}`),
  );
  res.json({ message: 'If an account uses that email, a reset link is on its way. It expires in 30 minutes.' });
});

// POST /api/auth/reset-password  { token, password }
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res) => {
  const ok = await withTransaction((db) => resetPassword(db, req.body.token, req.body.password));
  if (!ok) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');
  res.json({ message: 'Password changed. You can log in with your new password.' });
});

// POST /api/auth/logout  — revokes this browser's session.
router.post('/logout', async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (token) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
      [sha256(token)],
    );
  }
  clearRefreshCookie(res);
  res.status(204).end();
});

export default router;
