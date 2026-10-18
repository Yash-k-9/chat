// Auth CONTEXT: shares "who is logged in" with every component, without passing
// props through every level. Any component can call useAuth().
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionExpired, refreshSession, setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' = checking for an existing session, 'authenticated', or 'guest'
  const [status, setStatus] = useState('loading');

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // On page load: if the browser still has a valid refresh cookie, restore the session.
  useEffect(() => {
    let cancelled = false;
    onSessionExpired(endSession);

    refreshSession()
      .then((data) => {
        if (!cancelled) startSession(data);
      })
      .catch(() => {
        if (!cancelled) endSession();
      });

    return () => {
      cancelled = true;
    };
  }, [startSession, endSession]);

  const login = useCallback(
    async (username, password) => {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { username, password },
        skipRefresh: true,
      });
      startSession(data);
    },
    [startSession],
  );

  const register = useCallback(
    async ({ inviteCode, username, displayName, email, password }) => {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { inviteCode, username, displayName, email, password },
        skipRefresh: true,
      });
      startSession(data);
      return data; // includes chatId: the chat with whoever invited them
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipRefresh: true });
    } finally {
      endSession(); // log out locally even if the server is unreachable
    }
  }, [endSession]);

  // useMemo: only give consumers a new object when something actually changed.
  // updateUser: replace the stored user after a profile change (e.g. new email).
  const value = useMemo(
    () => ({ user, status, login, register, logout, updateUser: setUser }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
