// Service worker registration + web push subscription helpers.
import { api } from '../api/client.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // In development the worker doesn't cache (so Vite's live reload keeps working).
  const url = import.meta.env.DEV ? '/sw.js?dev=1' : '/sw.js';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url).catch((err) => console.warn('Service worker failed', err));
  });
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// The VAPID public key arrives as URL-safe base64; the browser wants raw bytes.
function base64UrlToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

// → 'unsupported' | 'unavailable' (server not configured) | 'denied' | 'on' | 'off'
export async function getPushStatus() {
  if (!pushSupported()) return 'unsupported';
  const { enabled } = await api('/push/public-key');
  if (!enabled) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

export async function enablePush() {
  const permission = await Notification.requestPermission(); // shows the browser's prompt
  if (permission !== 'granted') throw new Error('Notifications were not allowed.');
  const { publicKey } = await api('/push/public-key');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // every push must show a notification (browser rule)
    applicationServerKey: base64UrlToBytes(publicKey),
  });
  await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() });
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api('/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe();
}
