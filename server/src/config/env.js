// Reads and validates environment variables once, at startup.
// If something required is missing we crash immediately with a clear message,
// instead of failing later in a confusing way.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Number of reverse proxies in front of us (Render = 1). Needed for correct client IPs.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Public URL of the web app, used to build links in emails (password reset).
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Email (SMTP). If SMTP_HOST is empty, development prints emails to the console instead.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Private Chat <no-reply@localhost>',
  },
};

if (env.jwtAccessSecret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
}

export default env;
