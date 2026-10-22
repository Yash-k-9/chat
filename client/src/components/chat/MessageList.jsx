// Scrollable list of messages with day separators, "load older" on scroll-up,
// and smart auto-scroll (follow new messages only if you're already near the bottom).
import { useLayoutEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import Spinner from '../Spinner.jsx';
import { LockIcon } from '../Icons.jsx';
import { formatDayLabel } from '../../utils/formatTime.js';

const NEAR_BOTTOM_PX = 150;
const LOAD_OLDER_AT_PX = 120;
const GROUP_WITHIN_MS = 5 * 60 * 1000; // same sender within 5 minutes → tighter spacing

const messageKey = (m) => m?.clientId || m?.id;

// One-tap first messages for an empty chat.
const STARTERS = ['Hi! 👋', 'Hey, how are you?', 'Good to see you here'];

function EncryptionNotice({ otherName }) {
  return (
    <div className="mx-auto my-6 flex max-w-sm items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
      <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Messages and media with {otherName} are end-to-end encrypted. Only the two of you can read them.
      </span>
    </div>
  );
}

export default function MessageList({
  messages,
  myId,
  otherName,
  otherReceipt,
  hasMore,
  loadingOlder,
  otherTyping,
  theme,
  onLoadOlder,
  onRetry,
  onReply,
  onReact,
  onDelete,
  onOpenMedia,
  onSend, // null when the chat is read-only
}) {
  const containerRef = useRef(null);
  // What the list looked like after the previous render.
  const previousRef = useRef({ firstKey: null, lastKey: null, scrollHeight: 0, typing: false });

  // useLayoutEffect runs after the DOM updates but BEFORE the browser paints,
  // so scroll adjustments happen without a visible jump.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const previous = previousRef.current;
    const firstKey = messageKey(messages[0]);
    const lastKey = messageKey(messages.at(-1));
    const wasNearBottom = previous.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;

    if (previous.firstKey && firstKey !== previous.firstKey && lastKey === previous.lastKey) {
      // Older messages were added on top: keep the same messages under the user's eyes.
      el.scrollTop += el.scrollHeight - previous.scrollHeight;
    } else if (lastKey !== previous.lastKey) {
      // New message at the bottom: follow it if it's mine, the first load, or I was at the bottom.
      const mine = messages.at(-1)?.senderId === myId;
      if (!previous.lastKey || mine || wasNearBottom) el.scrollTop = el.scrollHeight;
    } else if (otherTyping !== previous.typing && wasNearBottom) {
      el.scrollTop = el.scrollHeight; // keep the typing dots visible
    }

    previousRef.current = { firstKey, lastKey, scrollHeight: el.scrollHeight, typing: otherTyping };
  }, [messages, otherTyping, myId]);

  function handleScroll() {
    const el = containerRef.current;
    if (el.scrollTop < LOAD_OLDER_AT_PX && hasMore && !loadingOlder) onLoadOlder();
  }

  // Tapping a reply quote scrolls to the original message (if it's loaded) and flashes it.
  function jumpTo(messageId) {
    const target = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.animate([{ backgroundColor: 'var(--c-accent-soft)' }, { backgroundColor: 'transparent' }], { duration: 1200 });
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 pb-4 md:px-8"
      role="log"
      aria-label={`Conversation with ${otherName}`}
    >
      {loadingOlder && (
        <div className="flex justify-center py-3">
          <Spinner className="h-5 w-5" />
        </div>
      )}

      {!hasMore && messages.length > 0 && <EncryptionNotice otherName={otherName} />}

      {/* Brand-new chat: empty state with one-tap starters */}
      {!hasMore && messages.length === 0 && (
        <div className="flex h-full animate-fade-in flex-col items-center justify-center py-10 text-center">
          <EncryptionNotice otherName={otherName} />
          <p className="text-base font-semibold">Start the conversation</p>
          <p className="mt-1 text-sm text-muted">Say hello to {otherName}.</p>
          {onSend && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => onSend(starter)}
                  className="h-9 rounded-full border border-line bg-surface px-4 text-sm font-medium shadow-sm transition hover:bg-subtle"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const newDay =
          !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
        const grouped =
          !newDay &&
          previous.senderId === message.senderId &&
          !message.content?.replyTo &&
          new Date(message.createdAt) - new Date(previous.createdAt) < GROUP_WITHIN_MS;

        return (
          <div key={messageKey(message)}>
            {newDay && (
              <div className="sticky top-2 z-10 my-4 flex justify-center">
                <span className="rounded-full border border-line bg-surface/95 px-3 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur">
                  {formatDayLabel(message.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              isMine={message.senderId === myId}
              myId={myId}
              otherName={otherName}
              otherReceipt={otherReceipt}
              groupedWithPrevious={grouped}
              theme={theme}
              canInteract={Boolean(onSend)}
              onRetry={onRetry}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
              onOpenMedia={onOpenMedia}
              onJumpTo={jumpTo}
            />
          </div>
        );
      })}

      {otherTyping && <TypingIndicator />}
    </div>
  );
}
