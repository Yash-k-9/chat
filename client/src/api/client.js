// One place for every call to the backend.
//
// - Keeps the ACCESS TOKEN in memory only (a JS variable). Not in localStorage,
//   where any injected script could read it. A page reload loses it, and that's fine:
//   we get a new one from /auth/refresh using the httpOnly cookie.
// - If a request returns 401 (token expired), it refreshes ONCE and retries.

// Empty in development (Vite proxies /api). In production: the backend's URL.
const API_URL = import.meta.env.VITE_API_URL || '';

let accessToken = null;
let refreshPromise = null;
let sessionExpiredHandler = () => {};

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

async function request(path, { method = 'GET', body } = {}) {
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
