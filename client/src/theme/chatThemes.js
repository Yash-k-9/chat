// Per-chat color themes ("moods"). Each viewer picks their own theme per chat;
// it's saved in this browser only (localStorage), the server never sees it.
// Tailwind needs full class names written out, so every class is spelled in full here.
import { useCallback, useState } from 'react';

export const CHAT_THEMES = {
  grape: {
    label: 'Grape',
    emoji: '🍇',
    gradient: 'from-violet-500 to-fuchsia-500', // my bubbles, send button, swatch
    glow: 'shadow-fuchsia-500/30',
    accentText: 'text-fuchsia-300',
    dot: 'bg-fuchsia-400', // typing dots
    wallpaper: 'rgb(192 132 252 / 0.10)', // dotted chat background
  },
  ocean: {
    label: 'Ocean',
    emoji: '🌊',
    gradient: 'from-sky-400 to-indigo-500',
    glow: 'shadow-sky-500/30',
    accentText: 'text-sky-300',
    dot: 'bg-sky-400',
    wallpaper: 'rgb(56 189 248 / 0.10)',
  },
  mint: {
    label: 'Mint',
    emoji: '🌿',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-500/30',
    accentText: 'text-emerald-300',
    dot: 'bg-emerald-400',
    wallpaper: 'rgb(52 211 153 / 0.10)',
  },
  sunset: {
    label: 'Sunset',
    emoji: '🌅',
    gradient: 'from-amber-400 to-rose-500',
    glow: 'shadow-orange-500/30',
    accentText: 'text-amber-300',
    dot: 'bg-amber-400',
    wallpaper: 'rgb(251 191 36 / 0.09)',
  },
  bubblegum: {
    label: 'Bubblegum',
    emoji: '🍬',
    gradient: 'from-pink-400 to-purple-500',
    glow: 'shadow-pink-500/30',
    accentText: 'text-pink-300',
    dot: 'bg-pink-400',
    wallpaper: 'rgb(244 114 182 / 0.10)',
  },
};

export const DEFAULT_THEME = 'grape';

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

  // Switching chats → load that chat's theme (done during render, no extra effect needed).
  if (state.chatId !== chatId) setState({ chatId, key: readTheme(chatId) });

  const setThemeKey = useCallback(
    (key) => {
      setState({ chatId, key });
      try {
        localStorage.setItem(storageKey(chatId), key);
      } catch {
        // Not saved; the theme still applies until the page reloads.
      }
    },
    [chatId],
  );

  return [CHAT_THEMES[state.key], state.key, setThemeKey];
}
