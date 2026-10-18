// Entry point: starts the HTTP server and attaches Socket.IO to it.
// Both share port 3000: normal requests go to Express, /socket.io/ goes to Socket.IO.
import http from 'node:http';
import env from './config/env.js';
import app from './app.js';
import { initSocket } from './socket/index.js';

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
