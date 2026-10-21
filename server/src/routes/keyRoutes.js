// /api/keys — public keys and encrypted key backups for end-to-end encryption.
// The server only ever handles PUBLIC keys and backups it cannot decrypt.
//
//   GET  /api/keys/me       → { publicKey, hasBackup }
//   PUT  /api/keys/me       { publicKey }  set or replace my public key
//   GET  /api/keys/backup   → my encrypted backup (to restore on a new device)
//   PUT  /api/keys/backup   { ciphertext, nonce, salt, opslimit, memlimit, publicKey }
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import validate from '../middleware/validate.js';
import HttpError from '../utils/httpError.js';
import { notifyKeyChanged } from '../socket/index.js';

const router = Router();

router.use(requireAuth);

// Base64 (URL-safe, no padding — libsodium's default) that decodes to exactly `bytes` bytes.
function base64OfLength(bytes) {
  return z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, 'Must be URL-safe base64')
    .refine((value) => Buffer.from(value, 'base64url').length === bytes, `Must decode to ${bytes} bytes`);
}

const publicKeySchema = z.object({ publicKey: base64OfLength(32) });

const backupSchema = z.object({
  publicKey: base64OfLength(32),
  ciphertext: base64OfLength(32 + 16), // 32-byte private key + 16-byte authentication tag
  nonce: base64OfLength(24),
  salt: base64OfLength(16),
  opslimit: z.number().int().min(2).max(10),
  memlimit: z.number().int().min(32 * 1024 * 1024).max(1024 * 1024 * 1024),
});

router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT public_key, key_backup IS NOT NULL AS has_backup FROM users WHERE id = $1',
    [req.user.id],
  );
  res.json({ publicKey: rows[0]?.public_key ?? null, hasBackup: Boolean(rows[0]?.has_backup) });
});

router.put('/me', validate(publicKeySchema), async (req, res) => {
  const { rows } = await pool.query('SELECT public_key FROM users WHERE id = $1', [req.user.id]);
  const changed = rows[0]?.public_key !== req.body.publicKey;

  if (changed) {
    // A new key makes the old backup useless (it holds the OLD private key), so drop it.
    await pool.query(
      `UPDATE users SET public_key = $1, public_key_updated_at = now(), key_backup = NULL, updated_at = now()
        WHERE id = $2`,
      [req.body.publicKey, req.user.id],
    );
    // Contacts reload their chat list → they get the new key and a "safety number changed" notice.
    await notifyKeyChanged(req.user.id);
  }

  res.json({ publicKey: req.body.publicKey, changed });
});

router.get('/backup', async (req, res) => {
  const { rows } = await pool.query('SELECT key_backup FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]?.key_backup) throw new HttpError(404, 'No key backup yet');
  res.json({ backup: rows[0].key_backup });
});

router.put('/backup', validate(backupSchema), async (req, res) => {
  // A backup must belong to the CURRENT key, or restoring it would bring back a stale key.
  const { rows } = await pool.query('SELECT public_key FROM users WHERE id = $1', [req.user.id]);
  if (rows[0]?.public_key !== req.body.publicKey) {
    throw new HttpError(409, 'This backup is for a different key than your current one');
  }

  const backup = { ...req.body, createdAt: new Date().toISOString() };
  await pool.query('UPDATE users SET key_backup = $1, updated_at = now() WHERE id = $2', [backup, req.user.id]);
  res.status(204).end();
});

export default router;
