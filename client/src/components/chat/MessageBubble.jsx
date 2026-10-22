// One message: bubble + hover actions (react, reply, delete) + reactions underneath.
// Mine: right side, solid accent color. Theirs: left side, light card.
// Messages that are ONLY 1–3 emojis are shown big, without a bubble.
import { useState } from 'react';
import { describeContent } from '../../chat/messageContent.js';
import { formatMessageTime } from '../../utils/formatTime.js';
import { ImageMessage, VideoMessage } from './MediaView.jsx';
import VoiceMessage from './VoiceMessage.jsx';
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  DoubleCheckIcon,
  LockIcon,
  ReplyIcon,
  SmileIcon,
  TimerIcon,
  TrashIcon,
} from '../Icons.jsx';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Emoji characters + the invisible bits that glue emojis together
// (zero-width joiner, variation selector, skin tones, flag letters, keycap).
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|‍|️|⃣|[\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]|\s)+$/u;

function bigEmojiCount(text = '') {
  if (!text || !EMOJI_ONLY.test(text)) return 0;
  const count = (text.match(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]{2}/gu) || []).length;
  return count <= 3 ? count : 0;
}

// Turn http(s) links into clickable links. React escapes everything else, so this is XSS-safe.
function Linkified({ text, linkClass }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className={`underline ${linkClass}`}>
        {part}
      </a>
    ) : (
      part
    ),
  );
}

// Which tick to show on MY message, based on the other person's delivered/read marks.
function deliveryState(message, otherReceipt) {
  if (message.status === 'sending' || message.status === 'failed') return message.status;
  if (otherReceipt && message.id <= otherReceipt.lastReadId) return 'read';
  if (otherReceipt && message.id <= otherReceipt.lastDeliveredId) return 'delivered';
  return 'sent';
}

function Ticks({ state }) {
  const label = { sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Not sent' }[state];
  return (
    <span title={label} aria-label={label} className="inline-flex">
      {state === 'sending' && <ClockIcon className="h-3.5 w-3.5" />}
      {state === 'sent' && <CheckIcon className="h-3.5 w-3.5" />}
      {state === 'delivered' && <DoubleCheckIcon className="h-4 w-4 opacity-70" />}
      {state === 'read' && <DoubleCheckIcon className="h-4 w-4 text-sky-300" />}
      {state === 'failed' && <AlertIcon className="h-3.5 w-3.5 text-red-300" />}
    </span>
  );
}

function ReplyQuote({ replyTo, mine, myId, otherName, onJumpTo }) {
  const who = replyTo.senderId === myId ? 'You' : otherName;
  return (
    <button
      type="button"
      onClick={() => onJumpTo(replyTo.id)}
      className={`mb-1.5 block w-full rounded-md border-l-[3px] px-2.5 py-1.5 text-left text-xs ${
        mine ? 'border-white/60 bg-white/15' : 'border-accent bg-subtle'
      }`}
    >
      <span className={`block font-semibold ${mine ? 'text-white' : 'text-accent-text'}`}>{who}</span>
      <span className={`line-clamp-2 ${mine ? 'text-white/85' : 'text-muted'}`}>{replyTo.preview}</span>
    </button>
  );
}

function Reactions({ reactions, myId, onToggle, mine }) {
  // Group identical emojis: [{ emoji, count, mineToo }]
  const groups = [];
  for (const { emoji, userId } of reactions) {
    const group = groups.find((g) => g.emoji === emoji);
    if (group) group.count += 1;
    else groups.push({ emoji, count: 1, mineToo: false });
    if (userId === myId) groups.find((g) => g.emoji === emoji).mineToo = true;
  }
  return (
    <div className={`-mt-1.5 flex gap-1 px-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {groups.map(({ emoji, count, mineToo }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(emoji)}
          className={`relative z-10 flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs shadow-sm transition ${
            mineToo ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-muted hover:bg-subtle'
          }`}
          aria-label={`${emoji} ${count}${mineToo ? ', including you' : ''}`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="font-medium">{count}</span>}
        </button>
      ))}
    </div>
  );
}

const actionButton = 'rounded-full p-1.5 text-muted transition hover:bg-subtle hover:text-fg';

export default function MessageBubble({
  message,
  isMine,
  myId,
  otherName,
  otherReceipt,
  groupedWithPrevious,
  theme,
  canInteract,
  onRetry,
  onReply,
  onReact,
  onDelete,
  onOpenMedia,
  onJumpTo,
}) {
  const [picking, setPicking] = useState(false); // quick-reaction picker open
  const [confirmDelete, setConfirmDelete] = useState(false);
  const state = isMine ? deliveryState(message, otherReceipt) : null;
  const { content } = message;
  const undecryptable = !message.deleted && (message.failed || !content);
  const kind = content?.kind;
  const emojiCount = kind === 'text' ? bigEmojiCount(content.text) : 0;
  const emojiSize = { 1: 'text-5xl', 2: 'text-4xl', 3: 'text-4xl' }[emojiCount];
  const saved = Boolean(message.id) && !message.deleted && !undecryptable;

  const meta = (
    <span className="flex items-center gap-1">
      {message.expiresAt && (
        <span title="Disappearing message">
          <TimerIcon className="h-3 w-3" />
        </span>
      )}
      {message.encrypted === false ? (
        <span title="Sent before encryption was turned on">🔓</span>
      ) : (
        <span title="End-to-end encrypted">
          <LockIcon className="h-3 w-3" />
        </span>
      )}
      <span>{formatMessageTime(message.createdAt)}</span>
      {isMine && !message.deleted && <Ticks state={state} />}
    </span>
  );

  let body;
  if (message.deleted) {
    body = (
      <p className={`flex items-center gap-1.5 text-sm italic ${isMine ? 'text-white/80' : 'text-muted'}`}>
        <TrashIcon className="h-3.5 w-3.5" /> This message was deleted
      </p>
    );
  } else if (undecryptable) {
    body = (
      <p className={`text-sm italic ${isMine ? 'text-white/80' : 'text-muted'}`}>
        Can&apos;t decrypt this message (it was sent with an older key)
      </p>
    );
  } else {
    body = (
      <>
        {content.replyTo && (
          <ReplyQuote replyTo={content.replyTo} mine={isMine} myId={myId} otherName={otherName} onJumpTo={onJumpTo} />
        )}
        {kind === 'image' && <ImageMessage media={content.media} upload={message.upload} onOpen={() => onOpenMedia(content.media)} />}
        {kind === 'video' && <VideoMessage media={content.media} upload={message.upload} onOpen={() => onOpenMedia(content.media)} />}
        {kind === 'voice' && <VoiceMessage media={content.media} upload={message.upload} mine={isMine} />}
        {content.text && kind !== 'voice' && (
          <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${kind !== 'text' ? 'mt-1.5 px-1' : ''}`}>
            <Linkified text={content.text} linkClass={isMine ? theme.link : 'text-accent'} />
          </p>
        )}
      </>
    );
  }

  const bubbleShape = isMine
    ? `${theme.bubble} text-white ${groupedWithPrevious ? '' : 'rounded-br-md'}`
    : `border border-line bg-surface text-fg ${groupedWithPrevious ? '' : 'rounded-bl-md'}`;
  const padding = kind === 'image' || kind === 'video' ? 'p-1 pb-1.5' : 'px-3.5 py-2';

  return (
    <div
      data-message-id={message.id}
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'} ${groupedWithPrevious ? 'mt-0.5' : 'mt-3'}`}
    >
      <div className={`relative flex max-w-[85%] flex-col sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Hover actions (desktop) — always reachable by keyboard too */}
        {saved && canInteract && (
          <div
            className={`absolute top-1 z-20 flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100 focus-within:opacity-100 ${
              picking || confirmDelete ? 'opacity-100' : ''
            } ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}
          >
            {picking ? (
              QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    onReact(message, emoji);
                  }}
                  className="rounded-full px-1 text-lg transition hover:scale-125"
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))
            ) : confirmDelete ? (
              <>
                <span className="px-2 text-xs font-medium text-fg">Delete for everyone?</span>
                <button type="button" onClick={() => onDelete(message)} className="rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full px-2 py-1 text-xs text-muted hover:bg-subtle">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPicking(true)} className={actionButton} aria-label="React" title="React">
                  <SmileIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onReply(message)} className={actionButton} aria-label="Reply" title="Reply">
                  <ReplyIcon className="h-4 w-4" />
                </button>
                {isMine && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-full p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger"
                    aria-label="Delete"
                    title="Delete for everyone"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {emojiCount && !content.replyTo ? (
          // Big emoji: no bubble, just the emoji and a small time underneath.
          <div className={`animate-pop-in ${state === 'failed' ? 'opacity-60' : ''}`} onDoubleClick={() => saved && onReact(message, '❤️')}>
            <p className={`${emojiSize} leading-tight`}>{content.text}</p>
            <div className={`mt-1 flex text-[11px] text-faint ${isMine ? 'justify-end' : ''}`}>{meta}</div>
          </div>
        ) : (
          <div
            onDoubleClick={() => saved && canInteract && onReact(message, '❤️')}
            className={`animate-pop-in rounded-2xl shadow-sm ${bubbleShape} ${padding} ${state === 'failed' ? 'opacity-60' : ''}`}
          >
            {body}
            <div className={`mt-0.5 flex justify-end px-1 text-[11px] ${isMine ? 'text-white/75' : 'text-faint'}`}>{meta}</div>
          </div>
        )}

        {message.reactions?.length > 0 && (
          <Reactions reactions={message.reactions} myId={myId} mine={isMine} onToggle={(emoji) => onReact(message, emoji)} />
        )}

        {state === 'failed' && (
          <button type="button" onClick={() => onRetry(message.clientId)} className="mt-1 text-xs font-medium text-danger hover:underline">
            Not sent · Retry
          </button>
        )}
      </div>
    </div>
  );
}

// Short text used when replying to a message.
export function replyPreview(message) {
  return (describeContent(message.content) || '').slice(0, 120);
}
