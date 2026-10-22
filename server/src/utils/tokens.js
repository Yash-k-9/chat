// Everything about tokens in one place.
//
// ACCESS TOKEN  = short-lived JWT (15 min) sent in the "Authorization: Bearer" header.
//                 The server can verify it without a database lookup.
// REFRESH TOKEN = long-lived random string (30 days) kept in an httpOnly cookie,
//                 so JavaScript (and XSS attacks) can't read it. Used only to get a
//                 new access token. Stored HASHED in the database so it can be revoked.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, env.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

// Throws if the token is invalid, tampered with, or expired.
export function verifyAccessToken(token) {
  // Pinning the algorithm blocks "alg: none" style attacks.
  return jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });
}

// Cryptographically secure random string (used for refresh tokens and invite codes).
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// One-way hash. We store hashes of tokens/codes, never the raw values.
export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Create a refresh token for a user, save its hash, and return the raw token.
// `db` can be the pool or a transaction client.
export async function issueRefreshToken(db, userId) {
  const token = generateRandomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, sha256(token), expiresAt],
  );

  return token;
}

// Cookie settings for the refresh token.
// The web app reaches /api on its OWN site (Vite proxy locally, Vercel rewrite in production),
// so the cookie is first-party and SameSite=Lax works in every browser, Safari included.
// Secure (HTTPS-only) in production; SameSite=None additionally requires Secure.
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    path: '/api/auth', // the browser sends the cookie ONLY to auth endpoints
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}
