// /api/push — register this browser for web push notifications.
//   GET    /api/push/public-key       → { publicKey, enabled }  (VAPID key the browser needs)
//   POST   /api/push/subscribe        { endpoint, keys: { p256dh, auth } }
//   DELETE /api/push/subscribe        { endpoint }
import { Router } from 'express';
import { z } from 'zod';
import env from '../config/env.js';
import requireAuth from '../middleware/requireAuth.js';
import validate from '../middleware/validate.js';
import { pushEnabled, removeSubscription, saveSubscription } from '../services/push.js';
import HttpError from '../utils/httpError.js';

const router = Router();
router.use(requireAuth);

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).refine((url) => url.startsWith('https://'), 'Push endpoints must be HTTPS'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

router.get('/public-key', (req, res) => {
  res.json({ publicKey: env.vapid.publicKey || null, enabled: pushEnabled });
});

router.post('/subscribe', validate(subscriptionSchema), async (req, res) => {
  if (!pushEnabled) throw new HttpError(503, 'Push notifications are not configured on this server');
  await saveSubscription(req.user.id, req.body);
  res.status(204).end();
});

router.delete('/subscribe', validate(z.object({ endpoint: z.string().max(1000) })), async (req, res) => {
  await removeSubscription(req.user.id, req.body.endpoint);
  res.status(204).end();
});

export default router;
