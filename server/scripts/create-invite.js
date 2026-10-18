// Create an invite code from the terminal. This is how the FIRST user gets in
// (there's no admin yet to create one through the API).
//
// Usage:  npm run invite            → valid for 7 days
//         npm run invite -- 2       → valid for 2 days
import pool from '../src/db/pool.js';
import { createInvite } from '../src/services/invites.js';

const days = Number(process.argv[2]) || 7;

try {
  const { code, expiresAt } = await createInvite(pool, { days });
  console.log('\nInvite code (shown only once):\n');
  console.log(`  ${code}\n`);
  console.log(`Expires: ${expiresAt.toLocaleString()}\n`);
} finally {
  await pool.end();
}
