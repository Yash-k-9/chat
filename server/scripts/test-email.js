// Send a test email to check your SMTP settings in .env.
// Usage:  npm run test-email -- you@example.com
import env from '../src/config/env.js';
import { explainMailError, sendMail } from '../src/services/mailer.js';

const to = process.argv[2];
if (!to) {
  console.log('Usage: npm run test-email -- you@example.com');
  process.exit(1);
}

if (!env.smtp.host) {
  console.log('\n❌ SMTP_HOST is empty in server/.env, so no real email can be sent.');
  console.log('   Fill in SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM (see .env.example).\n');
  process.exit(1);
}

if (!env.smtp.user || !env.smtp.pass) {
  console.log('\n❌ SMTP_USER or SMTP_PASS is empty in server/.env. Fill in both (see .env.example).\n');
  process.exit(1);
}

console.log(`Sending a test email to ${to} via ${env.smtp.host}:${env.smtp.port} as ${env.smtp.user}…`);
try {
  await sendMail({
    to,
    subject: 'Private Chat test email ✅',
    text: 'If you can read this, password-reset emails will work. 🎉',
  });
  console.log('\n✅ Sent! Check the inbox (and the Spam folder) of', to, '\n');
} catch (err) {
  console.log(`\n❌ Failed: ${explainMailError(err)}\n`);
  process.exit(1);
}
