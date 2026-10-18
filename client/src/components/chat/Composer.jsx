// Message input: grows with the text, Enter sends, Shift+Enter adds a new line.
import { useLayoutEffect, useRef, useState } from 'react';
import { SendIcon } from '../Icons.jsx';

const MAX_LENGTH = 4000; // same limit as the server
const MAX_HEIGHT_PX = 160;

export default function Composer({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-grow: reset the height, then set it to fit the content (up to a max).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    // Only show a scrollbar once the text is taller than the max height.
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [text]);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_LENGTH;

  function send() {
    if (!trimmed || tooLong || disabled) return;
    onSend(trimmed);
    setText('');
    textareaRef.current.focus();
  }

  function handleKeyDown(event) {
    // isComposing: don't send while typing with an IME (e.g. Japanese/Chinese input).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="border-t border-white/5 bg-panel/60 px-3 py-3 backdrop-blur md:px-5">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          aria-label="Message"
          className="max-h-40 flex-1 resize-none rounded-2xl border border-white/10 bg-ink/60 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={send}
          disabled={!trimmed || tooLong || disabled}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-fuchsia-500 text-white shadow-lg shadow-accent/20 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
      {text.length > MAX_LENGTH - 500 && (
        <p className={`mt-1 text-right text-xs ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
