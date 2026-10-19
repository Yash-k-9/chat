// Scrollable list of messages with day separators, "load older" on scroll-up,
// and smart auto-scroll (follow new messages only if you're already near the bottom).
import { useLayoutEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import Spinner from '../Spinner.jsx';
import { formatDayLabel } from '../../utils/formatTime.js';

const NEAR_BOTTOM_PX = 150;
const LOAD_OLDER_AT_PX = 120;
const GROUP_WITHIN_MS = 5 * 60 * 1000; // same sender within 5 minutes → tighter spacing

const messageKey = (m) => m?.clientId || m?.id;

// One-tap first messages for an empty chat.
const STARTERS = ['👋', 'Hey! 😊', 'What’s up? ✨'];

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

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 pb-5 md:px-8"
      role="log"
      aria-label={`Conversation with ${otherName}`}
    >
      {loadingOlder && (
        <div className="flex justify-center py-3">
          <Spinner className="h-5 w-5" />
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <p className="py-6 text-center text-xs font-semibold text-zinc-500">
          ✨ This is the beginning of your chat with {otherName} ✨
        </p>
      )}

      {/* Brand-new chat: friendly empty state with one-tap starters */}
      {!hasMore && messages.length === 0 && (
        <div className="flex h-full animate-fade-in flex-col items-center justify-center py-10 text-center">
          <span className="mb-3 animate-wiggle text-6xl" aria-hidden="true">👋</span>
          <p className="font-display text-xl font-semibold">Say hi to {otherName}!</p>
          <p className="mt-1 text-sm text-zinc-400">Break the ice with a tap:</p>
          {onSend && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => onSend(starter)}
                  className="rounded-full bg-raised px-4 py-2 font-semibold ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-tint-strong active:scale-95"
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
          new Date(message.createdAt) - new Date(previous.createdAt) < GROUP_WITHIN_MS;

        return (
          <div key={messageKey(message)}>
            {newDay && (
              <div className="sticky top-2 z-10 my-5 flex justify-center">
                <span className="rounded-full bg-panel/90 px-4 py-1.5 text-xs font-bold text-zinc-300 shadow-md ring-1 ring-line backdrop-blur">
                  {formatDayLabel(message.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              isMine={message.senderId === myId}
              otherReceipt={otherReceipt}
              groupedWithPrevious={grouped}
              theme={theme}
              onRetry={onRetry}
            />
          </div>
        );
      })}

      {otherTyping && <TypingIndicator dotClass={theme.dot} />}
    </div>
  );
}
