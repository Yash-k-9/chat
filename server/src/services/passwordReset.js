// Password reset: a one-time link, valid 30 minutes, sent to the user's email.
// Like refresh tokens, only a HASH of the token is stored.
import argon2 from 'argon2';
import env from '../config/env.js';
import { generateRandomToken, sha256 } from '../utils/tokens.js';
import { sendMail } from './mailer.js';

const RESET_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // at most one email per account every 2 minutes

// Creates a reset token and emails the link. Silently does nothing if there's no such
// email, or if one was sent very recently. The caller never learns which case happened.
export async function requestPasswordReset(db, email) {
  const { rows } = await db.query('SELECT id, display_name, email FROM users WHERE email = $1', [email]);
  const user = rows[0];
  // The BROWSER always gets the same answer (privacy). In development we explain in the
  // server terminal why nothing was sent, so you aren't left guessing.
  const devNote = (message) => {
    if (!env.isProduction) console.log(`🔑 Password reset for ${email}: ${message}`);
  };

  if (!user) {
    devNote('no account has this email, nothing sent. (Set it under "My account" first.)');
    return;
  }

  const recent = await db.query(
    `SELECT 1 FROM password_reset_tokens
      WHERE user_id = $1 AND created_at > now() - make_interval(secs => $2)`,
    [user.id, RESEND_COOLDOWN_MS / 1000],
  );
  if (recent.rows.length > 0) {
    devNote('a link was already sent less than 2 minutes ago, nothing sent.');
    return;
  }

  // Only the newest link should work: cancel older unused ones.
  await db.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [user.id],
  );

  const token = generateRandomToken(32);
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, sha256(token), new Date(Date.now() + RESET_TTL_MS)],
  );

  const link = `${env.appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Private Chat password',
    text:
      `Hi ${user.display_name},\n\n` +
      `Someone (hopefully you) asked to reset your password. Open this link within 30 minutes:\n\n` +
      `${link}\n\n` +
      `If you didn't ask for this, ignore this email — your password stays the same.`,
  });
  devNote('reset link created and handed to the mailer.');
}

// Uses a reset token: sets the new password and logs the user out everywhere.
// Must run inside a transaction. Returns true on success, false if the token is invalid.
export async function resetPassword(db, token, newPassword) {
  const { rows } = await db.query(
    `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      FOR UPDATE`,
    [sha256(token)],
  );
  const resetToken = rows[0];
  if (!resetToken) return false;

  const passwordHash = await argon2.hash(newPassword);
  await db.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    passwordHash,
    resetToken.user_id,
  ]);
  await db.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [resetToken.id]);

  // Whoever knew the old password (maybe an attacker) loses access on every device.
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [resetToken.user_id],
  );
  return true;
}
