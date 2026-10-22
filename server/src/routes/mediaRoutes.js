// /api/media — upload and download ENCRYPTED files (photos, videos, voice notes).
//
//   POST   /api/media?chatId=…   body = raw encrypted bytes  → { id }
//   GET    /api/media/:id        → raw encrypted bytes (only for members of that chat)
//   DELETE /api/media/:id        → the uploader removes it (e.g. "delete for everyone")
//
// The browser encrypts BEFORE uploading, so this server never sees a photo — only noise.
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import env from '../config/env.js';
import pool from '../db/pool.js';
import requireAuth from '../middleware/requireAuth.js';
import { isChatMember } from '../services/messages.js';
import { storage } from '../services/mediaStorage.js';
import HttpError from '../utils/httpError.js';

const router = Router();
router.use(requireAuth);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 60 : 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many uploads, try again later' },
});

const uuid = z.uuid();

router.post(
  '/',
  uploadLimiter,
  // Read the body as raw bytes (not JSON), with a size cap. Encryption adds 16 bytes.
  express.raw({ type: 'application/octet-stream', limit: env.maxMediaBytes + 1024 }),
  async (req, res) => {
    const chatId = uuid.safeParse(req.query.chatId);
    if (!chatId.success || !(await isChatMember(pool, chatId.data, req.user.id))) {
      throw new HttpError(404, 'Chat not found');
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Empty upload');

    const { rows: chatRows } = await pool.query('SELECT disappear_seconds, disconnected_at FROM chats WHERE id = $1', [
      chatId.data,
    ]);
    if (chatRows[0]?.disconnected_at) throw new HttpError(409, 'This chat is disconnected');
    const disappear = chatRows[0]?.disappear_seconds;

    const { rows } = await pool.query(
      `INSERT INTO media (chat_id, uploader_id, size, storage_key, expires_at)
       VALUES ($1, $2, $3, '', $4) RETURNING id`,
      // Disappearing chats: the file expires a little after its message would.
      [chatId.data, req.user.id, req.body.length, disappear ? new Date(Date.now() + (disappear + 3600) * 1000) : null],
    );
    const id = rows[0].id;

    try {
      const storageKey = await storage.put(id, req.body);
      await pool.query('UPDATE media SET storage_key = $1 WHERE id = $2', [storageKey, id]);
    } catch (err) {
      await pool.query('DELETE FROM media WHERE id = $1', [id]);
      throw err;
    }

    res.status(201).json({ id });
  },
);

router.get('/:id', async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'Not found');

  const { rows } = await pool.query(
    `SELECT m.storage_key FROM media m
       JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $2 AND cm.removed_at IS NULL
      WHERE m.id = $1 AND m.storage_key <> '' AND (m.expires_at IS NULL OR m.expires_at > now())`,
    [id.data, req.user.id],
  );
  if (!rows[0]) throw new HttpError(404, 'Not found'); // same answer for "missing" and "not yours"

  const bytes = await storage.get(rows[0].storage_key);
  res.set({
    'Content-Type': 'application/octet-stream',
    // Encrypted files never change, so the browser may cache them privately.
    'Cache-Control': 'private, max-age=31536000, immutable',
  });
  res.send(bytes);
});

router.delete('/:id', async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'Not found');
  const { rows } = await pool.query('DELETE FROM media WHERE id = $1 AND uploader_id = $2 RETURNING storage_key', [
    id.data,
    req.user.id,
  ]);
  if (rows[0]?.storage_key) await storage.remove(rows[0].storage_key).catch(() => {});
  res.status(204).end();
});

export default router;
