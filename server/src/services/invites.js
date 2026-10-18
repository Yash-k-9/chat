// Invite codes do two jobs:
//   1. let a NEW person sign up (the app is invite-only), and
//   2. CONNECT the person using it with the inviter (a chat is created for both).
// Any member can create one; the terminal script creates "inviter-less" ones for bootstrapping.
import { generateRandomToken, sha256 } from '../utils/tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the raw code. It is shown ONCE; only its hash is stored.
export async function createInvite(db, { createdBy = null, days = 7 } = {}) {
  const code = generateRandomToken(12); // 16 URL-safe characters
  const expiresAt = new Date(Date.now() + days * DAY_MS);

  await db.query(
    'INSERT INTO invites (code_hash, created_by, expires_at) VALUES ($1, $2, $3)',
    [sha256(code), createdBy, expiresAt],
  );

  return { code, expiresAt };
}

// How many of this user's invites are still waiting to be used (for a per-user cap).
export async function countActiveInvites(db, userId) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS count
       FROM invites
      WHERE created_by = $1 AND used_at IS NULL AND expires_at > now()`,
    [userId],
  );
  return rows[0].count;
}

// Atomically marks an invite as used. Returns { id, createdBy }, or null if the code is
// unknown, already used, or expired. Doing the check and the update in ONE statement
// means two people can't both use the same code at the same moment.
// Call it inside a transaction: if anything after it fails, the invite stays unused.
export async function consumeInvite(db, code) {
  const { rows } = await db.query(
    `UPDATE invites
        SET used_at = now()
      WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING id, created_by`,
    [sha256(code)],
  );
  const invite = rows[0];
  return invite ? { id: invite.id, createdBy: invite.created_by } : null;
}

export async function markInviteUsedBy(db, inviteId, userId) {
  await db.query('UPDATE invites SET used_by = $1 WHERE id = $2', [userId, inviteId]);
}
