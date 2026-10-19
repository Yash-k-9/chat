// Small built-in emoji picker (no library): a few tabs of popular emojis.
import { useCallback, useRef, useState } from 'react';
import useDismiss from '../../hooks/useDismiss.js';

const GROUPS = {
  '😀': ['😀', '😂', '🥹', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😇', '🤗', '🤔', '🙃', '😴', '😭', '😤', '😱', '🤯', '🫠', '😅', '🙈', '🤫', '🫡'],
  '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🖤', '🤍', '💖', '💕', '💯', '✨', '🔥', '⭐', '🌈', '🎉', '🎊', '💥', '💫', '🌟', '💐', '🌸', '🍀'],
  '👍': ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '✌️', '🤞', '🫶', '💪', '👀', '🫂', '🤙', '👌', '☝️', '🤘', '✋', '🙋', '🤷', '🤦', '💃', '🕺', '🏃'],
  '🍕': ['🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍰', '🎂', '🍩', '🍪', '🍫', '🍿', '☕', '🧋', '🍵', '🍺', '🍷', '🥂', '🍉', '🍓', '🥑', '🌶️', '🍦', '🥞'],
  '⚽': ['⚽', '🏏', '🏀', '🎮', '🎧', '🎵', '🎬', '📚', '✈️', '🚗', '🏠', '🏖️', '⛰️', '🌙', '☀️', '🌧️', '⏰', '📍', '🎁', '💡', '📸', '💻', '📱', '🛒'],
};

export default function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('😀');
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
        className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition hover:scale-110 active:scale-95 ${
          open ? 'bg-tint-strong' : 'hover:bg-tint-strong'
        }`}
      >
        😊
      </button>

      {open && (
        <div className="absolute bottom-14 left-0 z-20 w-[min(20rem,calc(100vw-2rem))] animate-pop-in rounded-3xl border border-line bg-panel p-3 shadow-2xl">
          <div className="mb-2 flex gap-1 border-b border-line pb-2" role="tablist">
            {Object.keys(GROUPS).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={group === key}
                onClick={() => setGroup(key)}
                className={`flex-1 rounded-xl py-1.5 text-xl transition ${group === key ? 'bg-tint-strong' : 'opacity-60 hover:opacity-100'}`}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto overflow-x-hidden">
            {GROUPS[group].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                aria-label={emoji}
                className="rounded-xl p-1 text-2xl transition hover:scale-125 hover:bg-tint-strong"
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
