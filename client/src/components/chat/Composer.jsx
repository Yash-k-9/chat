// Message input: reply bar, emoji, attach photo/video, a box that grows with the text,
// and either a Send button (when there's text) or a microphone for voice notes.
// Enter sends, Shift+Enter adds a new line.
import { useLayoutEffect, useRef, useState } from 'react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder.js';
import { formatDuration } from '../../chat/mediaPrep.js';
import EmojiPicker from './EmojiPicker.jsx';
import { CloseIcon, MicIcon, PaperclipIcon, ReplyIcon, SendIcon, TrashIcon } from '../Icons.jsx';

const MAX_LENGTH = 4000;
const MAX_HEIGHT_PX = 160;

const iconButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-subtle hover:text-fg';

function ReplyBar({ replyTo, onCancel }) {
  return (
    <div className="mb-2 flex animate-fade-in items-center gap-3 rounded-lg border-l-[3px] border-accent bg-subtle px-3 py-2">
      <ReplyIcon className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-semibold text-accent-text">Replying to {replyTo.name}</p>
        <p className="truncate text-muted">{replyTo.preview}</p>
      </div>
      <button onClick={onCancel} aria-label="Cancel reply" className="rounded-md p-1 text-faint hover:bg-hover hover:text-fg">
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function RecordingBar({ recorder, onCancel, onSend }) {
  const remaining = recorder.maxSeconds - recorder.seconds;
  return (
    <div className="flex flex-1 items-center gap-3 px-1">
      <button onClick={onCancel} aria-label="Discard recording" className={iconButton}>
        <TrashIcon />
      </button>
      <span
        className="h-3 w-3 shrink-0 rounded-full bg-danger transition-transform"
        style={{ transform: `scale(${1 + recorder.level * 0.8})` }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium tabular-nums" aria-live="polite">
        {formatDuration(recorder.seconds)}
      </span>
      <span className="flex-1 truncate text-xs text-faint">Recording… {remaining <= 10 && `${remaining}s left`}</span>
      <button onClick={onSend} aria-label="Send voice message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover">
        <SendIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

export default function Composer({ onSendText, onPickFile, onSendVoice, onTyping, replyTo, onCancelReply, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const recorder = useVoiceRecorder();

  // Auto-grow: reset the height, then set it to fit the content (up to a max).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [text]);

  // Focus the box when the user starts a reply.
  useLayoutEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_LENGTH;
  const canSend = Boolean(trimmed) && !tooLong && !disabled;

  function send() {
    if (!canSend) return;
    onSendText(trimmed);
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
    if (event.key === 'Escape' && replyTo) onCancelReply();
  }

  // Pasting a screenshot sends it like an attachment.
  function handlePaste(event) {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      onPickFile(file);
    }
  }

  async function startRecording() {
    setError('');
    try {
      await recorder.start();
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser settings.' : err.message);
    }
  }

  async function finishRecording() {
    const result = await recorder.stop();
    if (result && result.duration >= 1) onSendVoice(result.blob, result.duration, result.waveform);
  }

  return (
    <div className="border-t border-line bg-surface px-3 pb-3 pt-2 md:px-4">
      {replyTo && <ReplyBar replyTo={replyTo} onCancel={onCancelReply} />}
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      <div className="flex items-end gap-1">
        {recorder.recording ? (
          <RecordingBar recorder={recorder} onCancel={recorder.cancel} onSend={finishRecording} />
        ) : (
          <>
            <EmojiPicker onPick={insertEmoji} />
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              disabled={disabled}
              aria-label="Attach photo or video"
              title="Attach photo or video"
              className={iconButton}
            >
              <PaperclipIcon />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPickFile(file);
                event.target.value = ''; // allow picking the same file again
              }}
            />
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value) onTyping();
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Write a message…"
              aria-label="Message"
              className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-line bg-subtle px-3 py-2 text-[15px] leading-6 text-fg placeholder-faint outline-none transition focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent-soft focus-visible:outline-none"
            />
            {trimmed ? (
              <button
                onClick={send}
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent-hover disabled:opacity-40"
              >
                <SendIcon className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={disabled}
                aria-label="Record voice message"
                title="Record voice message"
                className={iconButton}
              >
                <MicIcon />
              </button>
            )}
          </>
        )}
      </div>
      {text.length > MAX_LENGTH - 500 && (
        <p className={`mt-1 text-right text-xs ${tooLong ? 'text-danger' : 'text-faint'}`}>
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
