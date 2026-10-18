// Input validation with zod: describe the expected shape once, and reject anything else.
// Never trust the request body.
import { z } from 'zod';

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3–20 characters: letters, numbers or _');

// Max length stops attackers from sending huge passwords to slow down hashing.
const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters');

// Trim + lowercase first, then check it looks like an email.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'));

// Only check presence for the CURRENT password: don't reveal the password rules.
const currentPassword = z.string().min(1, 'Password is required').max(128);

export const registerSchema = z.object({
  inviteCode: z.string().trim().min(1, 'Invite code is required').max(64),
  username,
  displayName: z.string().trim().min(1, 'Display name is required').max(40),
  email,
  password,
});

export const loginSchema = z.object({
  username,
  password: currentPassword,
});

export const createInviteSchema = z.object({
  days: z.number().int().min(1).max(30).default(7),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required').max(128),
  password,
});

export const changeEmailSchema = z.object({
  email,
  password: currentPassword,
});
