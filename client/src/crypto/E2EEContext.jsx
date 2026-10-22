// Manages MY encryption keys for the logged-in user and offers helpers to the rest of the app.
//
// On login it figures out which situation we're in:
//   • keys on this device match the server            → ready
//   • brand-new account (no key anywhere)             → generate keys, upload public key → ready
//   • server knows a key but this device doesn't have it (new phone/browser, cleared data)
//                                                     → needs-restore (unlock backup, or start fresh)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocketEvent } from '../realtime/SocketContext.jsx';
import { initSodium } from './sodium.js';
import { decryptMessage, deriveChatKey, encryptMessage, generateIdentityKeyPair, isEncryptedBody } from './e2ee.js';
import { createBackup, restoreBackup } from './backup.js';
import { getIdentity, saveIdentity } from './keyStore.js';

const E2EEContext = createContext(null);

export function E2EEProvider({ children }) {
  const { user } = useAuth();
  // 'loading' | 'ready' | 'needs-restore' | 'error'
  const [status, setStatus] = useState('loading');
  const [identity, setIdentity] = useState(null); // { publicKey, privateKey }
  const [server, setServer] = useState({ publicKey: null, hasBackup: false });
  const [error, setError] = useState('');
  const chatKeys = useRef(new Map()); // peer public key → derived chat key

  const activateIdentity = useCallback(async (keys) => {
    await saveIdentity(user.id, keys);
    chatKeys.current.clear();
    setIdentity(keys);
    setStatus('ready');
  }, [user.id]);

  // Only ONE setup may run at a time — in this tab (React dev mode runs effects twice) and
  // across tabs (navigator.locks). Otherwise two runs could each create and upload a
  // different key, and this device would end up holding the "wrong" one.
  const setUpRunning = useRef(null);

  const setUp = useCallback(() => {
    if (setUpRunning.current) return setUpRunning.current;

    const run = async () => {
      // A background re-check (e.g. after 'keys:changed') must not blank the open app.
      setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
      setError('');
      try {
        await initSodium();
        const [local, remote] = await Promise.all([getIdentity(user.id), api('/keys/me')]);
        setServer(remote);

        if (local && local.publicKey === remote.publicKey) {
          await activateIdentity(local);
        } else if (!remote.publicKey) {
          // Server has no key yet: use this device's key, or make a new one, and publish it.
          // Saved locally FIRST, so a parallel tab sees it and doesn't make its own.
          const keys = local || generateIdentityKeyPair();
          await saveIdentity(user.id, keys);
          await api('/keys/me', { method: 'PUT', body: { publicKey: keys.publicKey } });
          setServer({ publicKey: keys.publicKey, hasBackup: false });
          await activateIdentity(keys);
        } else {
          // The account's real key lives elsewhere (another device) — must restore or start fresh.
          setIdentity(null);
          setStatus('needs-restore');
        }
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    const locked = navigator.locks ? navigator.locks.request(`e2ee-setup:${user.id}`, run) : run();
    setUpRunning.current = locked.finally(() => {
      setUpRunning.current = null;
    });
    return setUpRunning.current;
  }, [user.id, activateIdentity]);

  useEffect(() => {
    setUp();
  }, [setUp]);

  // Another of my devices changed my key → re-check (this device may now be out of date).
  useSocketEvent('keys:changed', setUp);

  // New device: unlock the backup with the passphrase.
  const restore = useCallback(async (passphrase) => {
    const { backup } = await api('/keys/backup');
    const privateKey = restoreBackup(backup, passphrase); // throws "Wrong passphrase"
    await activateIdentity({ publicKey: backup.publicKey, privateKey });
  }, [activateIdentity]);

  // Lost the old key: make a new one. Old messages become unreadable on this account.
  const startFresh = useCallback(async () => {
    const keys = generateIdentityKeyPair();
    await api('/keys/me', { method: 'PUT', body: { publicKey: keys.publicKey } });
    setServer({ publicKey: keys.publicKey, hasBackup: false });
    await activateIdentity(keys);
  }, [activateIdentity]);

  const saveBackup = useCallback(async (passphrase) => {
    const backup = createBackup(identity.privateKey, identity.publicKey, passphrase);
    await api('/keys/backup', { method: 'PUT', body: backup });
    setServer((prev) => ({ ...prev, hasBackup: true }));
  }, [identity]);

  // Chat key for a contact (cached). null if they haven't set up encryption yet.
  const getChatKey = useCallback(
    (peerPublicKey) => {
      if (!identity || !peerPublicKey) return null;
      if (!chatKeys.current.has(peerPublicKey)) {
        chatKeys.current.set(peerPublicKey, deriveChatKey(identity.privateKey, identity.publicKey, peerPublicKey));
      }
      return chatKeys.current.get(peerPublicKey);
    },
    [identity],
  );

  // Turn a stored message body into something displayable.
  // → { text, encrypted: true } | { text, encrypted: false } (old plain message) | { text: null, failed: true }
  const readBody = useCallback(
    (peerPublicKey, { chatId, senderId, body }) => {
      if (!isEncryptedBody(body)) return { text: body, encrypted: false };
      const chatKey = getChatKey(peerPublicKey);
      if (!chatKey) return { text: null, failed: true };
      try {
        return { text: decryptMessage(chatKey, body, { chatId, senderId }), encrypted: true };
      } catch {
        return { text: null, failed: true }; // wrong/old key or tampered
      }
    },
    [getChatKey],
  );

  const sealBody = useCallback(
    (peerPublicKey, text, { chatId, senderId }) => encryptMessage(getChatKey(peerPublicKey), text, { chatId, senderId }),
    [getChatKey],
  );

  const value = useMemo(
    () => ({
      status,
      error,
      identity,
      hasBackup: server.hasBackup,
      retry: setUp,
      restore,
      startFresh,
      saveBackup,
      getChatKey,
      readBody,
      sealBody,
    }),
    [status, error, identity, server.hasBackup, setUp, restore, startFresh, saveBackup, getChatKey, readBody, sealBody],
  );

  return <E2EEContext.Provider value={value}>{children}</E2EEContext.Provider>;
}

export function useE2EE() {
  const context = useContext(E2EEContext);
  if (!context) throw new Error('useE2EE must be used inside <E2EEProvider>');
  return context;
}
