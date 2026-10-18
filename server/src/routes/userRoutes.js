// /api/users/* — every route here requires a valid access token.
import { Router } from 'express';
import argon2 from 'argon2';
import pool from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { changeEmailSchema } from '../validation/authSchemas.js';
import HttpError from '../utils/httpError.js';

const router = Router();

router.use(requireAuth);

function toMe(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    isAdmin: user.is_admin,
    email: user.email,
    createdAt: user.created_at,
  };
}

// GET /api/users/me  — who am I? (The client calls this after login/refresh.)
router.get('/me', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user: toMe(user) });
});

// PUT /api/users/me/email  { email, password }
// Asks for the current password: otherwise someone at your unlocked laptop could set
// THEIR email and then take over your account with "forgot password".
router.put('/me/email', authLimiter, validate(changeEmailSchema), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) throw new HttpError(404, 'User not found');

  if (!(await argon2.verify(user.password_hash, req.body.password))) {
    throw new HttpError(401, 'Wrong password');
  }

  try {
    const updated = await pool.query(
      'UPDATE users SET email = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [req.body.email, user.id],
    );
    res.json({ user: toMe(updated.rows[0]) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'That email is already used by another account');
    throw err;
  }
});

export default router;
