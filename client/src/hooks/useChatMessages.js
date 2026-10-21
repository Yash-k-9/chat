// Everything about ONE open chat: history, sending, live updates, ticks, typing.
// A custom hook = a function that uses other hooks, so components stay small.
//
// END-TO-END ENCRYPTION: the server only ever sees `body` = ciphertext. Every message that
// comes in is decrypted here into `text`; every message going out is encrypted right
// before it's sent. Messages in this hook's state always carry readable `text`.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../realtime/SocketContext.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';

const PAGE_SIZE = 30;
const SEND_TIMEOUT_MS = 10 * 1000;
const TYPING_REPEAT_MS = 2000; // re-send "typing" at most this often
const TYPING_IDLE_MS = 3000; // stop "typing" after this long without keystrokes
const TYPING_SHOW_MS = 5000; // hide the other person's indicator if no update arrives

// Merge new messages into the list without duplicates.
// A message can arrive twice (ack + 'message:new' echo, or a reload after reconnecting);
// clientId lets us match the server's copy to our optimistic "sending" bubble.
function mergeMessages(current, incoming) {
  const result = [...current];
  for (const message of incoming) {
    const index = result.findIndex(
      (m) => (m.id && m.id === message.id) || (message.clientId && m.clientId === message.clientId),
    );
    const confirmed = { ...message, status: 'sent' };
    if (index >= 0) result[index] = confirmed;
    else result.push(confirmed);
  }
  // Saved messages in id order; unsent ones (no id yet) stay at the end.
  const saved = result.filter((m) => m.id).sort((a, b) => a.id - b.id);
  const unsent = result.filter((m) => !m.id);
  return [...saved, ...unsent];
}

// peerPublicKey: the other person's public key (null if they haven't set up encryption).
export default function useChatMessages(chatId, peerPublicKey) {
  const { user } = useAuth();
  const { socket, renewToken } = useSocket();
  const { readBody, sealBody } = useE2EE();

  // Always the latest key, so callbacks don't need to be re-created when it changes.
  const peerKeyRef = useRef(peerPublicKey);
  peerKeyRef.current = peerPublicKey;

  // Server message (ciphertext body) → message with readable `text`.
  const open = useCallback((message) => ({ ...message, ...readBody(peerKeyRef.current, message) }), [readBody]);

  const [messages, setMessages] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const chatIdRef = useRef(chatId);
  const lastReadSentRef = useRef(0);
  const typingRef = useRef({ active: false, lastSentAt: 0, idleTimer: null });
  const otherTypingTimerRef = useRef(null);

  // ---- Loading history ----

  // Initial load whenever the open chat changes.
  useEffect(() => {
    chatIdRef.current = chatId;
    lastReadSentRef.current = 0;
    setMessages([]);
    setReceipts([]);
    setStatus('loading');
    setOtherTyping(false);

    let cancelled = false; // ignore the answer if the user already switched chats
    api(`/chats/${chatId}/messages?limit=${PAGE_SIZE}`)
      .then((data) => {
        if (cancelled) return;
        setMessages(mergeMessages([], data.messages.map(open)));
        setReceipts(data.receipts);
        setHasMore(data.hasMore);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // Reload when the other person's key changes, so messages are decrypted with the right key.
  }, [chatId, peerPublicKey, open]);

  // Infinite scroll: fetch the page before the oldest message we have.
  const loadOlder = useCallback(async () => {
    const oldest = messages.find((m) => m.id);
    if (!oldest || loadingOlder || !hasMore) return;

    setLoadingOlder(true);
    try {
      const data = await api(`/chats/${chatId}/messages?limit=${PAGE_SIZE}&before=${oldest.id}`);
      if (chatIdRef.current !== chatId) return;
      setMessages((prev) => mergeMessages(prev, data.messages.map(open)));
      setHasMore(data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, messages, loadingOlder, hasMore, open]);

  // After a reconnect we may have missed messages: fetch the newest page and merge.
  useSocketEvent('connect', () => {
    api(`/chats/${chatId}/messages?limit=${PAGE_SIZE}`)
      .then((data) => {
        if (chatIdRef.current !== chatId) return;
        setMessages((prev) => mergeMessages(prev, data.messages.map(open)));
        setReceipts(data.receipts);
      })
      .catch(() => {});
  });

  // ---- Live events from the server ----

  useSocketEvent('message:new', (message) => {
    if (message.chatId !== chatId) return;
    setMessages((prev) => mergeMessages(prev, [open(message)]));
    if (message.senderId !== user.id) setOtherTyping(false);
  });

  useSocketEvent('receipt:update', (receipt) => {
    if (receipt.chatId !== chatId) return;
    setReceipts((prev) => [...prev.filter((r) => r.userId !== receipt.userId), receipt]);
  });

  useSocketEvent('typing', ({ chatId: typingChatId, userId, isTyping }) => {
    if (typingChatId !== chatId || userId === user.id) return;
    setOtherTyping(isTyping);
    clearTimeout(otherTypingTimerRef.current);
    if (isTyping) otherTypingTimerRef.current = setTimeout(() => setOtherTyping(false), TYPING_SHOW_MS);
  });

  useEffect(() => () => clearTimeout(otherTypingTimerRef.current), []);

  // ---- Read receipts ----
  // While the chat is open AND the tab is visible, tell the server we've read up to the newest message.
  useEffect(() => {
    const newest = messages.findLast((m) => m.id);
    if (!newest) return;

    function markRead() {
      if (document.visibilityState !== 'visible' || newest.id <= lastReadSentRef.current) return;
      lastReadSentRef.current = newest.id;
      socket.emit('message:read', { chatId, messageId: newest.id });
    }

    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [messages, chatId, socket]);

  // ---- Sending ----

  const deliver = useCallback(
    async (message) => {
      try {
        // Encrypt right before sending. The plain `text` never leaves this browser.
        const body = sealBody(peerKeyRef.current, message.text, { chatId: message.chatId, senderId: message.senderId });
        const payload = { chatId: message.chatId, clientId: message.clientId, body };
        // emitWithAck waits for the server's answer; timeout() fails it if none comes.
        let response = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck('message:send', payload);
        if (!response.ok && response.error === 'auth_expired') {
          await renewToken();
          response = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck('message:send', payload);
        }
        if (!response.ok) throw new Error(response.error);
        setMessages((prev) => mergeMessages(prev, [open(response.message)]));
      } catch {
        // Not confirmed in time. If the socket sends it later anyway, the 'message:new'
        // echo replaces this "failed" bubble, and the server's clientId check prevents a duplicate.
        setMessages((prev) =>
          prev.map((m) => (m.clientId === message.clientId && !m.id ? { ...m, status: 'failed' } : m)),
        );
      }
    },
    [socket, renewToken, sealBody, open],
  );

  const stopTyping = useCallback(() => {
    const typing = typingRef.current;
    clearTimeout(typing.idleTimer);
    if (typing.active) socket.emit('typing', { chatId, isTyping: false });
    typing.active = false;
  }, [socket, chatId]);

  const sendMessage = useCallback(
    (text) => {
      if (!peerKeyRef.current) return; // can't encrypt for someone without a key
      stopTyping();
      // OPTIMISTIC UI: show the bubble immediately with a clock icon, confirm it later.
      const message = {
        clientId: crypto.randomUUID(),
        chatId,
        senderId: user.id,
        type: 'text',
        text,
        encrypted: true,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, message]);
      deliver(message);
    },
    [chatId, user.id, deliver, stopTyping],
  );

  const retryMessage = useCallback(
    (clientId) => {
      const message = messages.find((m) => m.clientId === clientId && m.status === 'failed');
      if (!message) return;
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: 'sending' } : m)));
      deliver(message);
    },
    [messages, deliver],
  );

  // Call on every keystroke. Sends "typing" at most every 2 s, and "stopped" after 3 s idle.
  const notifyTyping = useCallback(() => {
    const typing = typingRef.current;
    const now = Date.now();
    if (!typing.active || now - typing.lastSentAt > TYPING_REPEAT_MS) {
      socket.emit('typing', { chatId, isTyping: true });
      typing.active = true;
      typing.lastSentAt = now;
    }
    clearTimeout(typing.idleTimer);
    typing.idleTimer = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [socket, chatId, stopTyping]);

  // Leaving the chat: tell the other person we stopped typing.
  useEffect(() => stopTyping, [stopTyping]);

  // The other member's marks decide my ticks: ✓ sent, ✓✓ delivered, colored ✓✓ seen.
  const otherReceipt = receipts.find((r) => r.userId !== user.id) || null;

  return {
    messages,
    otherReceipt,
    hasMore,
    status,
    error,
    loadingOlder,
    otherTyping,
    loadOlder,
    sendMessage,
    retryMessage,
    notifyTyping,
  };
}
