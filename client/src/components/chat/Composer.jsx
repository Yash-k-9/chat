// Message input: emoji picker, a pill box that grows with the text, and a send button.
// Enter sends, Shift+Enter adds a new line.
import { useLayoutEffect, useRef, useState } from 'react';
import { SendIcon } from '../Icons.jsx';
import EmojiPicker from './EmojiPicker.jsx';

const MAX_LENGTH = 4000; // same limit as the server
const MAX_HEIGHT_PX = 160;

export default function Composer({ onSend, onTyping, disabled, theme }) {
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
  const canSend = Boolean(trimmed) && !tooLong && !disabled;

  function send() {
    if (!canSend) return;
    onSend(trimmed);
    setText('');
    textareaRef.current.focus();
  }

  // Insert the emoji where the cursor is, not just at the end.
  function insertEmoji(emoji) {
    const el = textareaRef.current;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    onTyping();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  function handleKeyDown(event) {
    // isComposing: don't send while typing with an IME (e.g. Japanese/Chinese input).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="bg-panel/70 px-3 pb-3 pt-2 backdrop-blur md:px-5 md:pb-4">
      <div className="flex items-end gap-2 rounded-[1.75rem] bg-raised p-1.5 ring-2 ring-transparent transition focus-within:ring-line">
        <EmojiPicker onPick={insertEmoji} />
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type something nice…"
          aria-label="Message"
          className="max-h-40 flex-1 resize-none self-center bg-transparent px-1 py-2 text-[15px] text-zinc-100 placeholder-zinc-500 outline-none focus-visible:outline-none"
        />
        <button
          onClick={send}
          disabled={!canSend}
          aria-label="Send message"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg transition duration-200 hover:-rotate-12 hover:scale-110 active:scale-90 disabled:scale-90 disabled:opacity-40 disabled:shadow-none ${theme.gradient} ${theme.glow}`}
        >
          <SendIcon className="h-5 w-5 -translate-x-px translate-y-px" />
        </button>
      </div>
      {text.length > MAX_LENGTH - 500 && (
        <p className={`mr-3 mt-1 text-right text-xs font-semibold ${tooLong ? 'text-rose-400' : 'text-zinc-500'}`}>
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
