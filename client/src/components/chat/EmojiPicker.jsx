// Small built-in emoji picker (no library): a few tabs of popular emojis.
import { useCallback, useRef, useState } from 'react';
import useDismiss from '../../hooks/useDismiss.js';
import { SmileIcon } from '../Icons.jsx';

const GROUPS = {
  Smileys: ['😀', '😂', '🥹', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😇', '🤗', '🤔', '🙃', '😴', '😭', '😤', '😱', '🤯', '🫠', '😅', '🙈', '🤫', '🫡'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🖤', '🤍', '💖', '💕', '💯', '✨', '🔥', '⭐', '🌈', '🎉', '🎊', '💥', '💫', '🌟', '💐', '🌸', '🍀'],
  Hands: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '✌️', '🤞', '🫶', '💪', '👀', '🫂', '🤙', '👌', '☝️', '🤘', '✋', '🙋', '🤷', '🤦', '💃', '🕺', '🏃'],
  Food: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍰', '🎂', '🍩', '🍪', '🍫', '🍿', '☕', '🧋', '🍵', '🍺', '🍷', '🥂', '🍉', '🍓', '🥑', '🌶️', '🍦', '🥞'],
  Things: ['⚽', '🏏', '🏀', '🎮', '🎧', '🎵', '🎬', '📚', '✈️', '🚗', '🏠', '🏖️', '⛰️', '🌙', '☀️', '🌧️', '⏰', '📍', '🎁', '💡', '📸', '💻', '📱', '🛒'],
};

export default function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('Smileys');
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        aria-expanded={open}
        title="Emoji"
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
          open ? 'bg-subtle text-fg' : 'text-muted hover:bg-subtle hover:text-fg'
        }`}
      >
        <SmileIcon />
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 z-30 w-[min(20rem,calc(100vw-2rem))] animate-pop-in rounded-xl border border-line bg-surface p-2 shadow-xl">
          <div className="mb-2 flex gap-1 border-b border-line pb-2" role="tablist">
            {Object.keys(GROUPS).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={group === key}
                onClick={() => setGroup(key)}
                className={`flex-1 rounded-md px-1 py-1 text-xs font-medium transition ${
                  group === key ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-subtle'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto overflow-x-hidden">
            {GROUPS[group].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                aria-label={emoji}
                className="rounded-md p-1 text-xl transition hover:bg-subtle"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
