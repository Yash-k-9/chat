// Per-chat accent color for MY message bubbles. Each viewer picks their own color per chat;
// it's saved in this browser only (localStorage), the server never sees it.
// Tailwind needs full class names written out, so every class is spelled in full here.
import { useCallback, useState } from 'react';

export const CHAT_THEMES = {
  blue: { label: 'Blue', bubble: 'bg-blue-600', swatch: 'bg-blue-600', link: 'text-blue-100' },
  teal: { label: 'Teal', bubble: 'bg-teal-600', swatch: 'bg-teal-600', link: 'text-teal-100' },
  emerald: { label: 'Green', bubble: 'bg-emerald-600', swatch: 'bg-emerald-600', link: 'text-emerald-100' },
  amber: { label: 'Amber', bubble: 'bg-amber-600', swatch: 'bg-amber-600', link: 'text-amber-100' },
  rose: { label: 'Rose', bubble: 'bg-rose-600', swatch: 'bg-rose-600', link: 'text-rose-100' },
  slate: { label: 'Graphite', bubble: 'bg-slate-700', swatch: 'bg-slate-700', link: 'text-slate-200' },
};

export const DEFAULT_THEME = 'blue';

const storageKey = (chatId) => `chat-theme:${chatId}`;

// localStorage can throw (private mode, blocked storage), so always wrap it.
function readTheme(chatId) {
  try {
    const saved = localStorage.getItem(storageKey(chatId));
    return CHAT_THEMES[saved] ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// const [theme, themeKey, setThemeKey] = useChatTheme(chatId)
export function useChatTheme(chatId) {
  const [state, setState] = useState(() => ({ chatId, key: readTheme(chatId) }));

  // Switching chats → load that chat's color (done during render, no extra effect needed).
  if (state.chatId !== chatId) setState({ chatId, key: readTheme(chatId) });

  const setThemeKey = useCallback(
    (key) => {
      setState({ chatId, key });
      try {
        localStorage.setItem(storageKey(chatId), key);
      } catch {
        // Not saved; the color still applies until the page reloads.
      }
    },
    [chatId],
  );

  return [CHAT_THEMES[state.key], state.key, setThemeKey];
}
