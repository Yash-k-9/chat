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
  // Number of reverse proxies in front of us (Render = 1, Vercel rewrite + Render = 2).
  // Needed so rate limiting sees each user's real IP.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Refresh-cookie SameSite policy. 'lax' when the web app reaches the API on the SAME site
  // (Vite proxy locally, Vercel rewrite in production — recommended). 'none' only if the
  // browser calls the API on another site directly (Safari will then block the cookie).
  cookieSameSite: ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax',
  // Public URL of the web app, used to build links in emails (password reset).
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Encrypted media storage. Cloudinary is used when CLOUDINARY_URL is set
  // (cloudinary://API_KEY:API_SECRET@CLOUD_NAME); otherwise files go to a local folder.
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  mediaDir: process.env.MEDIA_DIR || 'uploads',
  maxMediaBytes: (Number(process.env.MAX_MEDIA_MB) || 25) * 1024 * 1024,
  // Web push (notifications). Generate with: npm run vapid
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  },
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

// Production safety net: refuse to start with settings that would be insecure or broken.
if (env.isProduction) {
  if (env.jwtAccessSecret.includes('replace-me')) throw new Error('Set a real JWT_ACCESS_SECRET in production');
  if (env.corsOrigins.length === 0) throw new Error('Set CORS_ORIGINS to your web app URL in production');
  if (env.corsOrigins.some((origin) => origin.startsWith('http://'))) {
    throw new Error('CORS_ORIGINS must use https:// in production');
  }
  if (!env.appUrl.startsWith('https://')) throw new Error('APP_URL must use https:// in production');
  if (!env.cloudinaryUrl) {
    console.warn('⚠️  CLOUDINARY_URL is not set: media will be stored on local disk, which most hosts wipe on every deploy.');
  }
}

export default env;
