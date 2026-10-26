// One place for every call to the backend.
//
// - Keeps the ACCESS TOKEN in memory only (a JS variable). Not in localStorage,
//   where any injected script could read it. A page reload loses it, and that's fine:
//   we get a new one from /auth/refresh using the httpOnly cookie.
// - If a request returns 401 (token expired), it refreshes ONCE and retries.

// Where requests go:
//   API_URL       REST calls (login, refresh cookie, chats…). Empty = same origin: Vite's proxy
//                 in development, a Vercel rewrite in production. Same origin keeps the refresh
//                 cookie "first-party", which Safari and privacy-focused browsers require.
//   REALTIME_URL  Socket.IO + media uploads/downloads, straight to the backend (they use the
//                 access token, not cookies, and can be large/long-lived). Empty = same origin.
const API_URL = import.meta.env.VITE_API_URL || '';
export const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || API_URL;

let accessToken = null;
let refreshPromise = null;
let sessionExpiredHandler = () => {};
// Which account THIS tab belongs to. All tabs share one login cookie, so if another tab
// logs into a different account, a refresh here would silently return THAT account.
let currentUserId = null;
let accountSwitchedHandler = () => {};

export function setCurrentUserId(id) {
  currentUserId = id;
}

// AuthContext registers what to do when another tab switched to a different account.
export function onAccountSwitched(handler) {
  accountSwitchedHandler = handler;
}

export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details; // field errors from the server's validator
  }
}

export function setAccessToken(token) {
  accessToken = token;
}

// The socket needs the token for its handshake.
export function getAccessToken() {
  return accessToken;
}

// Called when the session is definitely gone (refresh failed): log out everywhere in the UI.
export function expireSession() {
  accessToken = null;
  sessionExpiredHandler();
}

// AuthContext registers a callback here so it can log the user out
// when the session can no longer be refreshed.
export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

// 502/503/504 come from the proxies in front of the server (Vercel's rewrite, Render's load
// balancer), usually while a sleeping Render instance wakes up, so the request never ran.
const GATEWAY_ERRORS = [502, 503, 504];
const MAX_RETRIES = 3;
const WAKE_TIMEOUT_MS = 90 * 1000; // a free Render instance takes 30–60 s to wake up
const WAKE_POLL_MS = 3000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let wakePromise = null;

// Polls /api/health until the server answers (or we give up). Calls made while one is in
// flight share it. Login pages call this on load, so a sleeping Render instance starts
// waking up while the user is still typing. Resolves to true once the server is up.
export function wakeServer() {
  if (!wakePromise) {
    wakePromise = (async () => {
      const deadline = Date.now() + WAKE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
          if (res.ok) return true;
        } catch {
          // network error: keep trying
        }
        await sleep(WAKE_POLL_MS);
      }
      return false;
    })().finally(() => {
      // Don't cache the result: the server can fall asleep again in a long-open tab.
      wakePromise = null;
    });
  }
  return wakePromise;
}

async function request(path, options = {}) {
  // Only retry requests that are safe to repeat. Refresh is included: a gateway error on it
  // would otherwise log the user out. Login too: a gateway error means it never reached the server.
  const method = options.method || 'GET';
  const retryable = method === 'GET' || path === '/auth/refresh' || path === '/auth/login';
  for (let i = 0; ; i++) {
    try {
      return await requestOnce(path, options);
    } catch (err) {
      if (!retryable || !GATEWAY_ERRORS.includes(err.status) || i >= MAX_RETRIES) throw err;
      // Wait until the server is actually awake instead of retrying blindly.
      if (!(await wakeServer())) throw err;
      await sleep(1000);
    }
  }
}

async function requestOnce(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include', // send the refresh cookie (needed cross-origin in production)
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is it running?");
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details);
  }
  return data;
}

// Get a new access token using the refresh cookie.
// Refresh tokens work ONCE (rotation), so two refreshes at the same time would look
// like token theft to the server. We prevent that in two ways:
//   1. refreshPromise: calls in THIS tab share one in-flight request.
//   2. navigator.locks: OTHER tabs of the app wait their turn.
export function refreshSession() {
  if (!refreshPromise) {
    const doRefresh = () => request('/auth/refresh', { method: 'POST' });
    const run = navigator.locks
      ? navigator.locks.request('chat-auth-refresh', doRefresh)
      : doRefresh();

    refreshPromise = run
      .then((data) => {
        // The cookie now belongs to someone else (another tab logged into a different
        // account). Never mix two accounts in one tab: let the app switch cleanly.
        if (currentUserId && data.user.id !== currentUserId) {
          accessToken = null;
          accountSwitchedHandler();
          throw new ApiError(401, 'You logged into a different account in another tab.');
        }
        accessToken = data.accessToken;
        return data;
      })
      .catch((err) => {
        accessToken = null;
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Main helper used by the app: api('/chats'), api('/chats', { method: 'POST', body }).
// Pass { skipRefresh: true } for login/register, where 401 means "wrong password".
export async function api(path, options = {}) {
  try {
    return await request(path, options);
  } catch (err) {
    if (err.status !== 401 || options.skipRefresh) throw err;

    try {
      await refreshSession();
    } catch {
      expireSession();
      throw new ApiError(401, 'Your session expired. Please log in again.');
    }
    return request(path, options);
  }
}

// Runs `attempt()`; on a 401 refreshes the session once and tries again.
async function withRefresh(attempt) {
  try {
    return await attempt();
  } catch (err) {
    if (err.status !== 401) throw err;
    try {
      await refreshSession();
    } catch {
      expireSession();
      throw new ApiError(401, 'Your session expired. Please log in again.');
    }
    return attempt();
  }
}

// Upload ENCRYPTED bytes. Uses XMLHttpRequest (not fetch) because it reports upload
// progress, so the UI can show a progress ring. Resolves to { id }.
export function uploadMedia(chatId, bytes, onProgress = () => {}) {
  const attempt = () =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${REALTIME_URL}/api/media?chatId=${encodeURIComponent(chatId)}`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          // not JSON
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(xhr.status, data.error || `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new ApiError(0, "Can't reach the server. Is it running?"));
      xhr.send(bytes);
    });
  return withRefresh(attempt);
}

// Download ENCRYPTED bytes of a media file → Uint8Array.
export function downloadMedia(id) {
  const attempt = async () => {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    let res;
    try {
      res = await fetch(`${REALTIME_URL}/api/media/${id}`, { headers, credentials: 'include' });
    } catch {
      throw new ApiError(0, "Can't reach the server. Is it running?");
    }
    if (!res.ok) throw new ApiError(res.status, res.status === 404 ? 'File not available' : 'Download failed');
    return new Uint8Array(await res.arrayBuffer());
  };
  return withRefresh(attempt);
}
