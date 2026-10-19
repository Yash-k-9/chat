// 🎨 button in the chat header: pick this chat's color theme.
import { useCallback, useRef, useState } from 'react';
import { CHAT_THEMES } from '../../theme/chatThemes.js';
import useDismiss from '../../hooks/useDismiss.js';

export default function ThemePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat theme"
        aria-expanded={open}
        title="Chat theme"
        className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-tint-strong active:scale-95"
      >
        🎨
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-56 animate-pop-in rounded-3xl border border-line bg-panel p-2 shadow-2xl">
          <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Chat mood</p>
          {Object.entries(CHAT_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => {
                onChange(key);
                close();
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-tint ${
                value === key ? 'bg-tint' : ''
              }`}
            >
              <span className={`h-7 w-7 rounded-full bg-gradient-to-br shadow-md ${theme.gradient}`} />
              <span className="flex-1 font-semibold">
                {theme.emoji} {theme.label}
              </span>
              {value === key && <span aria-label="selected">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
