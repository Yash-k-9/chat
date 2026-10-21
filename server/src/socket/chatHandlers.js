// Events a browser can send over its socket, and what the server does with each.
//
//   message:send       { chatId, clientId, body }  → save, push 'message:new' to the chat
//   typing             { chatId, isTyping }        → push 'typing' to the others in the chat
//   message:delivered  { chatId, messageId }       → push 'receipt:update' (✓✓ grey)
//   message:read       { chatId, messageId }       → push 'receipt:update' (✓✓ colored)
//   auth:renew         { token }                   → swap in a fresh access token
//
// Every event can be answered with an "ack" (a callback): { ok: true, ... } or { ok: false, error }.
import { z } from 'zod';
import pool from '../db/pool.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ENCRYPTED_BODY, MAX_MESSAGE_LENGTH, advanceReceipt, saveMessage } from '../services/messages.js';
import { isChatDisconnected } from '../services/chats.js';
import { chatRoom } from './rooms.js';

// Per-socket flood protection: at most 60 events every 10 seconds.
// (Typing + delivered + read events count too, so leave room for fast chatting.)
const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX_EVENTS = 60;

const schemas = {
  'message:send': z.object({
    chatId: z.uuid(),
    clientId: z.uuid(),
    // Ciphertext ONLY. Plain text is rejected, so the server never stores readable messages.
    body: z.string().max(MAX_MESSAGE_LENGTH).regex(ENCRYPTED_BODY, 'Messages must be end-to-end encrypted'),
  }),
  typing: z.object({ chatId: z.uuid(), isTyping: z.boolean() }),
  receipt: z.object({ chatId: z.uuid(), messageId: z.number().int().positive() }),
  'auth:renew': z.object({ token: z.string().min(1) }),
};

// An error whose message is safe to send back to the browser.
class SocketError extends Error {}

function isRateLimited(socket) {
  const now = Date.now();
  socket.data.eventTimes = (socket.data.eventTimes || []).filter((t) => now - t < RATE_WINDOW_MS);
  socket.data.eventTimes.push(now);
  return socket.data.eventTimes.length > RATE_MAX_EVENTS;
}

export function registerChatHandlers(io, socket) {
  const userId = socket.data.user.id;

  // A socket may only touch chats whose room it joined (= chats the user is a member of).
  function assertMember(chatId) {
    if (!socket.rooms.has(chatRoom(chatId))) throw new SocketError('Chat not found');
  }

  // Wraps every handler with the same checks: setup done, token valid, not flooding,
  // payload valid. Then runs the handler and sends the result through the ack.
  function on(event, schema, handler, { checkExpiry = true } = {}) {
    socket.on(event, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        await socket.data.ready;

        if (checkExpiry && Date.now() >= socket.data.tokenExp) {
          socket.emit('auth:expired');
          return reply({ ok: false, error: 'auth_expired' });
        }
        if (isRateLimited(socket)) return reply({ ok: false, error: 'Too many requests, slow down' });

        const parsed = schema.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, error: 'Invalid data' });

        const result = await handler(parsed.data);
        reply({ ok: true, ...result });
      } catch (err) {
        if (err instanceof SocketError) return reply({ ok: false, error: err.message });
        console.error(`Socket event "${event}" failed`, err);
        reply({ ok: false, error: 'Server error' });
      }
    });
  }

  // Disconnected ("unfollowed") chats are read-only.
  async function assertConnected(chatId) {
    if (await isChatDisconnected(pool, chatId)) throw new SocketError('This chat is disconnected');
  }

  on('message:send', schemas['message:send'], async ({ chatId, clientId, body }) => {
    assertMember(chatId);
    await assertConnected(chatId);

    const { message, created } = await saveMessage(pool, {
      chatId,
      senderId: userId,
      clientId,
      type: 'text',
      body,
    });

    // Push to everyone in the chat, including the sender's other tabs.
    // A retried message (created = false) was already pushed the first time.
    if (created) io.to(chatRoom(chatId)).emit('message:new', message);

    return { message };
  });

  on('typing', schemas.typing, async ({ chatId, isTyping }) => {
    assertMember(chatId);
    await assertConnected(chatId);
    // socket.to(...) = everyone in the room EXCEPT this socket.
    socket.to(chatRoom(chatId)).emit('typing', { chatId, userId, isTyping });
    return {};
  });

  async function handleReceipt({ chatId, messageId }, read) {
    assertMember(chatId);
    const receipt = await advanceReceipt(pool, { chatId, userId, messageId, read });
    if (receipt) io.to(chatRoom(chatId)).emit('receipt:update', receipt);
    return {};
  }
  on('message:delivered', schemas.receipt, (data) => handleReceipt(data, false));
  on('message:read', schemas.receipt, (data) => handleReceipt(data, true));

  // Renewing must work even when the old token has just expired, so skip that check.
  on(
    'auth:renew',
    schemas['auth:renew'],
    async ({ token }) => {
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        throw new SocketError('Invalid token');
      }
      if (payload.sub !== userId) throw new SocketError('Invalid token');
      socket.data.tokenExp = payload.exp * 1000;
      return {};
    },
    { checkExpiry: false },
  );
}
