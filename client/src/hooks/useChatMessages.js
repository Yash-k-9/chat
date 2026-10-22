// Everything about ONE open chat: history, sending (text, photos, videos, voice notes),
// live updates, ticks, typing, replies, reactions, deleting and disappearing messages.
//
// END-TO-END ENCRYPTION: the server only ever sees `body` = ciphertext. Every message that
// comes in is decrypted here into `content` ({ kind, text, media, replyTo }); everything
// going out is encrypted right before it's sent. Files are encrypted before upload.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, uploadMedia } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../realtime/SocketContext.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { encryptFile } from '../crypto/mediaCrypto.js';
import { decodeContent, encodeContent } from '../chat/messageContent.js';
import { prepareImage, prepareVideo } from '../chat/mediaPrep.js';
import { primeMediaCache } from './useMediaUrl.js';

const PAGE_SIZE = 30;
const SEND_TIMEOUT_MS = 10 * 1000;
const TYPING_REPEAT_MS = 2000; // re-send "typing" at most this often
const TYPING_IDLE_MS = 3000; // stop "typing" after this long without keystrokes
const TYPING_SHOW_MS = 5000; // hide the other person's indicator if no update arrives

// Reactions are encrypted too; their associated data ties them to one message.
const reactionContext = (chatId, messageId) => `${chatId}#reaction#${messageId}`;

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
    if (index >= 0) result[index] = { ...result[index], ...confirmed, upload: undefined };
    else result.push(confirmed);
  }
  // Saved messages in id order; unsent ones (no id yet) stay at the end.
  const saved = result.filter((m) => m.id).sort((a, b) => a.id - b.id);
  const unsent = result.filter((m) => !m.id);
  return [...saved, ...unsent];
}

const notExpired = (m) => !m.expiresAt || new Date(m.expiresAt) > new Date();

// peerPublicKey: the other person's public key (null if they haven't set up encryption).
export default function useChatMessages(chatId, peerPublicKey) {
  const { user } = useAuth();
  const { socket, renewToken } = useSocket();
  const { readBody, sealBody } = useE2EE();

  const [messages, setMessages] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // Always the latest key, so callbacks don't need to be re-created when it changes.
  const peerKeyRef = useRef(peerPublicKey);
  peerKeyRef.current = peerPublicKey;

  const chatIdRef = useRef(chatId);
  const lastReadSentRef = useRef(0);
  const typingRef = useRef({ active: false, lastSentAt: 0, idleTimer: null });
  const otherTypingTimerRef = useRef(null);
  const pendingFiles = useRef(new Map()); // clientId → { file, kind } for retrying failed uploads

  const decryptReaction = useCallback(
    (messageId, { userId, body }) =>
      readBody(peerKeyRef.current, { chatId: reactionContext(chatId, messageId), senderId: userId, body }).text,
    [readBody, chatId],
  );

  // Server message (ciphertext body) → message with readable `content`.
  const open = useCallback(
    (message) => {
      if (message.deleted) return { ...message, content: null, encrypted: true, failed: false };
      const { text, encrypted, failed } = readBody(peerKeyRef.current, message);
      const reactions = (message.reactions || [])
        .map((reaction) => ({ userId: reaction.userId, emoji: decryptReaction(message.id, reaction) }))
        .filter((reaction) => reaction.emoji);
      return { ...message, content: failed ? null : decodeContent(text), encrypted, failed, reactions };
    },
    [readBody, decryptReaction],
  );

  // ---- Loading history ----

  // Initial load whenever the open chat (or the other person's key) changes.
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

  // Disappearing messages: hide them on time, even before the server's cleanup runs.
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) => (prev.every(notExpired) ? prev : prev.filter(notExpired)));
    }, 15 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Live events from the server ----

  useSocketEvent('message:new', (message) => {
    if (message.chatId !== chatId) return;
    setMessages((prev) => mergeMessages(prev, [open(message)]));
    if (message.senderId !== user.id) setOtherTyping(false);
  });

  useSocketEvent('message:deleted', ({ chatId: deletedChatId, messageId }) => {
    if (deletedChatId !== chatId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: null, reactions: [] } : m)),
    );
  });

  useSocketEvent('reaction:update', ({ chatId: reactionChatId, messageId, userId, body }) => {
    if (reactionChatId !== chatId) return;
    const emoji = body ? decryptReaction(messageId, { userId, body }) : null;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const others = (m.reactions || []).filter((r) => r.userId !== userId);
        return { ...m, reactions: emoji ? [...others, { userId, emoji }] : others };
      }),
    );
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

  const patchMessage = useCallback((clientId, patch) => {
    setMessages((prev) => prev.map((m) => (m.clientId === clientId && !m.id ? { ...m, ...patch } : m)));
  }, []);

  // Emit with one automatic retry if the socket's token just expired.
  const emitWithRenew = useCallback(
    async (event, payload) => {
      let response = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck(event, payload);
      if (!response.ok && response.error === 'auth_expired') {
        await renewToken();
        response = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck(event, payload);
      }
      if (!response.ok) throw new Error(response.error);
      return response;
    },
    [socket, renewToken],
  );

  // Encrypt the message content and send it. For media, the file is uploaded first.
  const deliver = useCallback(
    async (message) => {
      try {
        let { content } = message;

        // Media that isn't uploaded yet: prepare (resize, strip metadata) → encrypt → upload.
        const pending = pendingFiles.current.get(message.clientId);
        if (pending && !content.media?.uploaded) {
          const prepared = pending.kind === 'video' ? await prepareVideo(pending.file) : pending.prepared;
          const bytes = new Uint8Array(await prepared.blob.arrayBuffer());
          const { ciphertext, key, nonce } = encryptFile(bytes);
          const { id } = await uploadMedia(chatId, ciphertext, (progress) =>
            patchMessage(message.clientId, { upload: { progress } }),
          );
          primeMediaCache(id, prepared.blob); // the sender never has to download their own file
          const { blob: _blob, ...details } = prepared;
          content = { ...content, media: { ...details, ...(pending.extra || {}), id, key, nonce, size: bytes.length, uploaded: true } };
          patchMessage(message.clientId, { content });
          pendingFiles.current.delete(message.clientId);
        }

        // `uploaded` is only a local flag; don't send it.
        const wire = content.media ? { ...content, media: { ...content.media, uploaded: undefined, localId: undefined } } : content;
        const body = sealBody(peerKeyRef.current, encodeContent(wire), { chatId, senderId: user.id });
        const response = await emitWithRenew('message:send', { chatId, clientId: message.clientId, body });
        setMessages((prev) => mergeMessages(prev, [open(response.message)]));
      } catch {
        // Not confirmed. If the socket sends it later anyway, the 'message:new' echo replaces
        // this "failed" bubble, and the server's clientId check prevents a duplicate.
        patchMessage(message.clientId, { status: 'failed', upload: undefined });
      }
    },
    [chatId, user.id, sealBody, emitWithRenew, open, patchMessage],
  );

  const stopTyping = useCallback(() => {
    const typing = typingRef.current;
    clearTimeout(typing.idleTimer);
    if (typing.active) socket.emit('typing', { chatId, isTyping: false });
    typing.active = false;
  }, [socket, chatId]);

  // Add an optimistic bubble (shown immediately with a clock icon) and send it.
  const enqueue = useCallback(
    (content, extra = {}) => {
      if (!peerKeyRef.current) return; // can't encrypt for someone without a key
      stopTyping();
      const message = {
        clientId: crypto.randomUUID(),
        chatId,
        senderId: user.id,
        type: 'text',
        content,
        encrypted: true,
        reactions: [],
        createdAt: new Date().toISOString(),
        status: 'sending',
        ...extra,
      };
      return message;
    },
    [chatId, user.id, stopTyping],
  );

  const sendText = useCallback(
    (text, replyTo = null) => {
      const message = enqueue({ kind: 'text', text, ...(replyTo && { replyTo }) });
      if (!message) return;
      setMessages((prev) => [...prev, message]);
      deliver(message);
    },
    [enqueue, deliver],
  );

  // file: a File from the picker / drag & drop / paste. caption: optional text.
  const sendFile = useCallback(
    async (file, caption = '', replyTo = null) => {
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const message = enqueue({ kind, ...(caption && { text: caption }), ...(replyTo && { replyTo }) });
      if (!message) return;

      // Photos are processed first so the bubble can show the (metadata-free) picture right away.
      let prepared = null;
      let preview = {};
      if (kind === 'image') {
        prepared = await prepareImage(file);
        preview = { width: prepared.width, height: prepared.height, thumb: prepared.thumb, mime: prepared.mime };
      } else {
        const meta = await prepareVideo(file);
        preview = { width: meta.width, height: meta.height, thumb: meta.thumb, poster: meta.poster, duration: meta.duration, mime: meta.mime };
      }
      const localId = `local-${message.clientId}`;
      primeMediaCache(localId, prepared ? prepared.blob : file);
      message.content = { ...message.content, media: { ...preview, id: localId, localId, uploaded: false } };
      message.upload = { progress: 0 };
      pendingFiles.current.set(message.clientId, { file, kind, prepared });

      setMessages((prev) => [...prev, message]);
      deliver(message);
    },
    [enqueue, deliver],
  );

  // Voice note: an audio Blob recorded in the browser, plus its length and a small waveform.
  const sendVoice = useCallback(
    (blob, duration, waveform) => {
      const message = enqueue({ kind: 'voice' });
      if (!message) return;
      const localId = `local-${message.clientId}`;
      primeMediaCache(localId, blob);
      message.content = { kind: 'voice', media: { id: localId, localId, mime: blob.type, duration, waveform, uploaded: false } };
      message.upload = { progress: 0 };
      pendingFiles.current.set(message.clientId, {
        kind: 'voice',
        prepared: { blob, mime: blob.type },
        extra: { duration, waveform },
      });
      setMessages((prev) => [...prev, message]);
      deliver(message);
    },
    [enqueue, deliver],
  );

  const retryMessage = useCallback(
    (clientId) => {
      const message = messages.find((m) => m.clientId === clientId && m.status === 'failed');
      if (!message) return;
      patchMessage(clientId, { status: 'sending' });
      deliver({ ...message, status: 'sending' });
    },
    [messages, deliver, patchMessage],
  );

  // "Delete for everyone" (only my own messages). Also removes the uploaded file.
  const deleteMessage = useCallback(
    async (message) => {
      await emitWithRenew('message:delete', { chatId, messageId: message.id });
      const mediaId = message.content?.media?.id;
      if (mediaId && !mediaId.startsWith('local-')) api(`/media/${mediaId}`, { method: 'DELETE' }).catch(() => {});
    },
    [chatId, emitWithRenew],
  );

  // React with an emoji; reacting with the same emoji again removes it.
  const react = useCallback(
    async (message, emoji) => {
      const mine = message.reactions?.find((r) => r.userId === user.id);
      const remove = mine?.emoji === emoji;
      const body = remove
        ? null
        : sealBody(peerKeyRef.current, emoji, { chatId: reactionContext(chatId, message.id), senderId: user.id });
      await emitWithRenew('reaction:set', { chatId, messageId: message.id, body });
    },
    [chatId, user.id, sealBody, emitWithRenew],
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

  // The other member's marks decide my ticks: ✓ sent, ✓✓ delivered, blue ✓✓ seen.
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
    sendText,
    sendFile,
    sendVoice,
    retryMessage,
    deleteMessage,
    react,
    notifyTyping,
  };
}
