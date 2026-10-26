// Entry point: starts the HTTP server and attaches Socket.IO to it.
// Both share port 3000: normal requests go to Express, /socket.io/ goes to Socket.IO.
import http from 'node:http';
import env from './config/env.js';
import app from './app.js';
import pool from './db/pool.js';
import { initSocket } from './socket/index.js';
import { checkMailer } from './services/mailer.js';
import { cleanupExpired } from './services/messages.js';
import { storageName } from './services/mediaStorage.js';
import { pushEnabled } from './services/push.js';

const server = http.createServer(app);
// Render's load balancer reuses idle connections longer than Node's 5s default. If Node closes
// one first, the next request on it fails with a 502 that never reaches Express (or the logs).
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 121 * 1000;
initSocket(server);

// Every minute: permanently delete disappeared messages and expired media files.
const CLEANUP_EVERY_MS = 60 * 1000;
setInterval(() => {
  cleanupExpired(pool).catch((err) => console.error('Cleanup failed', err));
}, CLEANUP_EVERY_MS).unref();

server.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  console.log(`🗂️  Media: encrypted files stored in ${storageName}`);
  console.log(`🔔 Push notifications: ${pushEnabled ? 'enabled' : 'off (run "npm run vapid" and add the keys to .env)'}`);
  checkMailer(); // prints whether password-reset emails will really be sent
});

// Graceful shutdown (Render/Docker send SIGTERM): stop accepting connections, close the DB pool.
process.on('SIGTERM', () => {
  server.close(() => pool.end().then(() => process.exit(0)));
});
