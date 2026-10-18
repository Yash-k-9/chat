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
