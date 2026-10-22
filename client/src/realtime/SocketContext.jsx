// One Socket.IO connection for the whole logged-in app, shared through context.
//   useSocket()                 → { socket, connected, renewToken }
//   useSocketEvent(name, fn)    → listen to a server event while a component is mounted
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { REALTIME_URL, expireSession, getAccessToken, refreshSession } from '../api/client.js';

// Sockets connect straight to the backend (they authenticate with the token, not cookies).
// Empty in development = same origin, through Vite's proxy.
const SOCKET_URL = REALTIME_URL || undefined;

// The server checks the token on connect and on every event, but tokens last 15 minutes.
// We renew a bit before that, so a long chat session never gets interrupted.
const RENEW_EVERY_MS = 10 * 60 * 1000;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  // Created once. autoConnect: false → we connect in the effect below.
  // auth is a FUNCTION so every (re)connect sends the CURRENT token, not the first one.
  const [socket] = useState(() =>
    io(SOCKET_URL, {
      autoConnect: false,
      auth: (callback) => callback({ token: getAccessToken() }),
    }),
  );
  const [connected, setConnected] = useState(false);

  // Get a fresh access token and hand it to the live socket.
  const renewToken = useCallback(async () => {
    try {
      const data = await refreshSession();
      if (socket.connected) await socket.timeout(5000).emitWithAck('auth:renew', { token: data.accessToken });
    } catch (err) {
      if (err.status === 401) expireSession(); // refresh token gone → back to login
    }
  }, [socket]);

  useEffect(() => {
    async function reconnectWithFreshToken() {
      try {
        await refreshSession();
        socket.connect();
      } catch (err) {
        if (err.status === 401) expireSession();
      }
    }

    function onConnect() {
      setConnected(true);
    }
    function onDisconnect(reason) {
      setConnected(false);
      // The server kicked us (e.g. token expired). Socket.IO won't retry by itself here.
      if (reason === 'io server disconnect') reconnectWithFreshToken();
    }
    function onConnectError(err) {
      // Handshake rejected because the token was missing/expired: refresh and retry.
      // Other errors (server down) are retried automatically by Socket.IO.
      if (err.message === 'unauthorized') reconnectWithFreshToken();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('auth:expired', renewToken);
    socket.connect();

    const renewTimer = setInterval(renewToken, RENEW_EVERY_MS);

    return () => {
      clearInterval(renewTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('auth:expired', renewToken);
      socket.disconnect(); // logging out unmounts this provider → connection closes
    };
  }, [socket, renewToken]);

  return (
    <SocketContext.Provider value={{ socket, connected, renewToken }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside <SocketProvider>');
  return context;
}

// Subscribe to a server event. The handler can use the latest props/state without
// re-subscribing on every render (we keep it in a ref).
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (...args) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
