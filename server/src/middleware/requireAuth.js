// JWT middleware: protects a route so only logged-in users can reach it.
// Expects the header "Authorization: Bearer <accessToken>".
import { verifyAccessToken } from '../utils/tokens.js';

export default function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  try {
    const payload = verifyAccessToken(token);
    // Make the user available to the route handler.
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    // Expired or invalid. The client should call /api/auth/refresh and retry.
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
