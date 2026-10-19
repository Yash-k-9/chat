// Sending email (only password-reset links for now) with nodemailer over SMTP.
// No SMTP configured + development → the email is printed to the terminal instead,
// so you can test without an email account.
import nodemailer from 'nodemailer';
import env from '../config/env.js';

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 465 = TLS from the start; 587 = upgrades with STARTTLS
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

// Turns common SMTP errors into a plain-English hint.
export function explainMailError(err) {
  if (err.code === 'EAUTH' || err.responseCode === 535) {
    return 'Login rejected. For Gmail, SMTP_PASS must be a 16-letter App password (not your normal password), and SMTP_USER must be the full Gmail address.';
  }
  if (err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
    return `Could not reach ${env.smtp.host}:${env.smtp.port}. Check SMTP_HOST / SMTP_PORT, your internet, or a firewall/antivirus blocking port ${env.smtp.port}.`;
  }
  if (err.code === 'EENVELOPE') return 'The recipient or MAIL_FROM address is invalid.';
  return err.message;
}

// Called once at startup: tells you in the terminal whether email will actually work.
export async function checkMailer() {
  if (!transporter) {
    console.log(
      env.isProduction
        ? '📧 Email: NOT configured — password-reset emails cannot be sent (set SMTP_HOST in .env).'
        : '📧 Email: SMTP not configured — reset links will be PRINTED in this terminal instead of emailed.',
    );
    return;
  }
  try {
    await transporter.verify(); // logs in to the SMTP server without sending anything
    console.log(`📧 Email: connected to ${env.smtp.host} as ${env.smtp.user || '(no login)'} ✅`);
  } catch (err) {
    console.error(`📧 Email: SMTP check FAILED — ${explainMailError(err)}`);
  }
}

export async function sendMail({ to, subject, text }) {
  if (transporter) {
    await transporter.sendMail({ from: env.smtp.from, to, subject, text });
    return;
  }

  if (env.isProduction) {
    // Never print reset links into production logs: anyone reading logs could use them.
    console.error(`Email to ${to} NOT sent: SMTP is not configured (set SMTP_HOST in .env)`);
    return;
  }

  console.log(`\n----- EMAIL (dev mode, not actually sent) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----------------------------------------------\n`);
}
