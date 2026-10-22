// SERVICE WORKER: a small script the browser runs in the background, even when no tab of
// the app is open. It does two things here:
//   1. caches the app's files so it opens fast and can be installed as an app (PWA)
//   2. shows push notifications ("You have a new message") and opens the chat on click
//
// It NEVER caches /api or /socket.io (private, always-fresh data).

const CACHE = 'private-chat-v1';
// In development (registered as /sw.js?dev=1) skip caching so Vite's live reload keeps working.
const DEV = new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (DEV || request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  // Page loads: network first (always the newest app), cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Built files (/assets/… have a content hash in the name, so they never change): cache first.
  if (url.pathname.startsWith('/assets/') || /\.(svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

// A push arrived from our server (through the browser vendor's push service).
// The payload never contains message text — only "You have a new message" + the chat id.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // ignore malformed payloads
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Private Chat', {
      body: data.body || 'You have a new message',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'new-message', // replace the previous notification instead of stacking many
      renotify: true,
      data: { url: data.chatId ? `/chats/${data.chatId}` : '/chats' },
    }),
  );
});

// Tapping the notification: focus an open app tab, or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/chats';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        open.navigate(target).catch(() => {});
        return open.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
