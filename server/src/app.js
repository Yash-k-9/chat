// Builds and configures the Express app (middleware + routes).
// Kept separate from server.js so tests can import the app without opening a port.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import pool from './db/pool.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import keyRoutes from './routes/keyRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import pushRoutes from './routes/pushRoutes.js';

const app = express();

// Behind a proxy (Render), trust its X-Forwarded-For header so rate limits see real IPs.
app.set('trust proxy', env.trustProxy);
app.use((req, res, next) => {
  console.log(req.method, req.path, 'ip=', req.ip,
    'xff=', req.headers['x-forwarded-for'],
    'ua=', req.headers['user-agent']);
  next();
});
// Security headers (hides "X-Powered-By: Express", adds safe defaults).
app.use(helmet());

// Strict CORS: only the origins listed in .env may call the API from a browser.
// credentials: true lets the browser send our httpOnly refresh-token cookie.
app.use(cors({ origin: env.corsOrigins, credentials: true }));

// Parse JSON bodies (small size limit) and cookies.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// All API routes live under /api so the client can proxy one prefix.
const api = express.Router();
api.use(apiLimiter);

api.get('/', (req, res) => {
  res.json({ message: 'Hello from the chat server 👋' });
});

// Health check: is the server alive, and can it reach the database?
api.get('/health', async (req, res) => {
  let database = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    database = 'unreachable';
  }
  const healthy = database === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database,
    uptime: process.uptime(),
  });
});

api.use('/auth', authRoutes);
api.use('/users', userRoutes);
api.use('/invites', inviteRoutes);
api.use('/chats', chatRoutes);
api.use('/keys', keyRoutes);
api.use('/media', mediaRoutes);
api.use('/push', pushRoutes);

app.use('/api', api);

// 404 for any route we did not define.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler. Known errors (HttpError, bad JSON, body too large) carry a
// status and a safe message; anything else is logged and hidden behind a generic 500.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  // Log real crashes; deliberate errors (HttpError, e.g. a 503 "not configured") are expected.
  if (status >= 500 && !err.expose) console.error(err);
  const message = status < 500 && err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

export default app;
