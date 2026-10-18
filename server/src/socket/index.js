// Socket.IO server: one long-lived, two-way connection per browser tab.
// HTTP = the browser asks, the server answers. A socket lets the SERVER push too
// (new messages, typing, ticks) the moment something happens.
import { Server } from 'socket.io';
import env from '../config/env.js';
import pool from '../db/pool.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { getUserChatIds, markAllDelivered } from '../services/messages.js';
import { registerChatHandlers } from './chatHandlers.js';
import { chatRoom, userRoom } from './rooms.js';

// A socket whose access token expired more than this long ago is disconnected.
const EXPIRY_GRACE_MS = 60 * 1000;

let io = null;

// AUTHENTICATION: runs once, before the connection is accepted.
// The browser sends its access token in the handshake: io(url, { auth: { token } }).
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));

  try {
    const payload = verifyAccessToken(token);
    socket.data.user = { id: payload.sub, username: payload.username };
    socket.data.tokenExp = payload.exp * 1000; // JWT "exp" is in seconds
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

async function setUpConnection(socket) {
  const userId = socket.data.user.id;

  // Join my personal room and one room per chat I'm in.
  // From now on, socket.rooms doubles as "which chats may this socket use".
  socket.join(userRoom(userId));
  const chatIds = await getUserChatIds(pool, userId);
  socket.join(chatIds.map(chatRoom));

  // Offline delivery: messages saved while I was away are now delivered to me.
  // Tell the senders, so their single tick becomes a double tick.
  const receipts = await markAllDelivered(pool, userId);
  for (const receipt of receipts) {
    io.to(chatRoom(receipt.chatId)).emit('receipt:update', receipt);
  }
}

function handleConnection(socket) {
  // Handlers are registered right away, but each one waits for `ready`,
  // so no event is processed before the socket has joined its rooms.
  socket.data.ready = setUpConnection(socket);
  socket.data.ready.catch((err) => {
    console.error('Socket setup failed', err);
    socket.disconnect(true);
  });

  registerChatHandlers(io, socket);
}

// Sockets live for hours, but access tokens last 15 minutes. The client renews its
// token over the socket ('auth:renew'); sockets that stop renewing get disconnected.
function disconnectExpiredSockets() {
  const now = Date.now();
  for (const socket of io.of('/').sockets.values()) {
    if (now > socket.data.tokenExp + EXPIRY_GRACE_MS) {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    maxHttpBufferSize: 64 * 1024, // reject socket messages bigger than 64 KB
  });

  io.use(authenticateSocket);
  io.on('connection', handleConnection);

  setInterval(disconnectExpiredSockets, 60 * 1000).unref();
  return io;
}

// Called by REST routes when a new chat is created (someone used an invite):
// put both users' open connections into the chat room and tell their browsers.
export function notifyNewChat(chatId, userIds) {
  if (!io) return;
  for (const userId of userIds) {
    io.in(userRoom(userId)).socketsJoin(chatRoom(chatId));
    io.to(userRoom(userId)).emit('chat:new', { chatId });
  }
}

// Called when a chat changes (e.g. disconnected): its members reload the chat list.
export function notifyChatUpdated(chatId) {
  if (!io) return;
  io.to(chatRoom(chatId)).emit('chat:updated', { chatId });
}
