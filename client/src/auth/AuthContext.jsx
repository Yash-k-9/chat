// Auth CONTEXT: shares "who is logged in" with every component, without passing
// props through every level. Any component can call useAuth().
//
// ONE ACCOUNT PER BROWSER: every tab shares the same login cookie (like WhatsApp Web).
// Tabs keep each other in sync over a BroadcastChannel:
//   • log out in one tab        → every tab goes to the login page
//   • log in as someone else    → other tabs reload as that account (never a half-mix)
// To use two accounts at once, use a private window or another browser/profile.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  onAccountSwitched,
  onSessionExpired,
  refreshSession,
  setAccessToken,
  setCurrentUserId,
} from '../api/client.js';

const AuthContext = createContext(null);
const CHANNEL_NAME = 'private-chat-auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' = checking for an existing session, 'authenticated', or 'guest'
  const [status, setStatus] = useState('loading');
  const userRef = useRef(null); // latest user, readable inside channel listeners
  const channelRef = useRef(null);

  const broadcast = useCallback((message) => {
    try {
      channelRef.current?.postMessage(message);
    } catch {
      // channel closed — nothing to sync
    }
  }, []);

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setCurrentUserId(data.user.id);
    userRef.current = data.user;
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(() => {
    setAccessToken(null);
    setCurrentUserId(null);
    userRef.current = null;
    setUser(null);
    setStatus('guest');
  }, []);

  // ---- Keep tabs in sync ----
  useEffect(() => {
    // Another tab logged into a different account: start over as that account.
    onAccountSwitched(() => window.location.reload());

    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = ({ data }) => {
      if (data?.type === 'logout') {
        // The shared cookie was revoked in another tab, so this tab is logged out too.
        endSession();
      } else if (data?.type === 'login') {
        const current = userRef.current;
        if (!current) {
          // I'm on the login page: pick up the new session without retyping anything.
          refreshSession().then(startSession).catch(() => {});
        } else if (current.id !== data.userId) {
          // I'm showing a different account: reload as the new one.
          window.location.reload();
        }
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [startSession, endSession]);

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
      broadcast({ type: 'login', userId: data.user.id });
    },
    [startSession, broadcast],
  );

  const register = useCallback(
    async ({ inviteCode, username, displayName, email, password }) => {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { inviteCode, username, displayName, email, password },
        skipRefresh: true,
      });
      startSession(data);
      broadcast({ type: 'login', userId: data.user.id });
      return data; // includes chatId: the chat with whoever invited them
    },
    [startSession, broadcast],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipRefresh: true });
    } finally {
      endSession(); // log out locally even if the server is unreachable
      broadcast({ type: 'logout' });
    }
  }, [endSession, broadcast]);

  // useMemo: only give consumers a new object when something actually changed.
  // updateUser: replace the stored user after a profile change (e.g. new email).
  const updateUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateUser }),
    [user, status, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
