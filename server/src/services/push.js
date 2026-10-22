// WEB PUSH notifications (works even when the app's tab is closed, via a service worker).
// Privacy rule: notifications NEVER contain message content or the sender's name — the push
// goes through Google/Mozilla/Apple servers, so it only says "You have a new message".
import webpush from 'web-push';
import env from '../config/env.js';
import pool from '../db/pool.js';
import { isOnline } from '../socket/presence.js';

export const pushEnabled = Boolean(env.vapid.publicKey && env.vapid.privateKey);

if (pushEnabled) webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);

export async function saveSubscription(userId, subscription) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
  );
}

export async function removeSubscription(userId, endpoint) {
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
}

// Called after a new message: notify chat members (except the sender) who have no app open.
export async function notifyOfflineMembers(chatId, senderId) {
  if (!pushEnabled) return;
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.endpoint, s.p256dh, s.auth
       FROM chat_members cm
       JOIN push_subscriptions s ON s.user_id = cm.user_id
      WHERE cm.chat_id = $1 AND cm.user_id <> $2 AND cm.removed_at IS NULL`,
    [chatId, senderId],
  );

  const payload = JSON.stringify({ title: 'Private Chat', body: 'You have a new message', chatId });
  for (const sub of rows) {
    if (isOnline(sub.user_id)) continue; // they'll see it in the open app
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'high' },
      );
    } catch (err) {
      // 404/410 = the browser unsubscribed or the subscription expired: forget it.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
      }
    }
  }
}
