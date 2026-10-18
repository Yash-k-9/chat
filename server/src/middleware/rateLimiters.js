// Rate limiting: cap how many requests one IP address can make in a time window.
// This slows down password guessing and protects the server from floods.
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

// Locally you log in/out and reload constantly while testing, so limits are 10x looser.
// Production (NODE_ENV=production) uses the real values below.
const DEV_MULTIPLIER = env.isProduction ? 1 : 10;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const common = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-8', // send RateLimit headers so clients know their limit
  legacyHeaders: false,
};

// Whole API: generous, just stops abuse (page loads, chat lists, history, refreshes).
export const apiLimiter = rateLimit({
  ...common,
  limit: 1000 * DEV_MULTIPLIER,
  message: { error: 'Too many requests, please slow down' },
});

// Login and register: only FAILED attempts count (wrong password, bad invite...),
// so normal use never hits the limit but password guessing still does.
export const authLimiter = rateLimit({
  ...common,
  limit: 20 * DEV_MULTIPLIER,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed attempts, try again in 15 minutes' },
});

// Forgot password: EVERY request counts (it always "succeeds"), to stop email spamming.
export const forgotPasswordLimiter = rateLimit({
  ...common,
  limit: 5 * DEV_MULTIPLIER,
  message: { error: 'Too many reset requests, try again in 15 minutes' },
});

// Accepting invites: only failed attempts count, to stop invite-code guessing.
export const inviteLimiter = rateLimit({
  ...common,
  limit: 30 * DEV_MULTIPLIER,
  skipSuccessfulRequests: true,
  message: { error: 'Too many invalid invite codes, try again in 15 minutes' },
});
