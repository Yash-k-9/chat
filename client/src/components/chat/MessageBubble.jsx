// One chat bubble. Mine: right side, theme gradient, with ticks. Theirs: left side.
// Messages that are ONLY 1–3 emojis are shown big, without a bubble (like WhatsApp/iMessage).
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '../Icons.jsx';
import { formatMessageTime } from '../../utils/formatTime.js';

// Emoji characters + the invisible bits that glue emojis together
// (zero-width joiner, variation selector, skin tones, flag letters, keycap).
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|‍|️|⃣|[\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]|\s)+$/u;

function bigEmojiCount(text) {
  if (!EMOJI_ONLY.test(text)) return 0;
  const count = (text.match(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]{2}/gu) || []).length;
  return count <= 3 ? count : 0;
}

// Which tick to show on MY message, based on the other person's delivered/read marks.
function deliveryState(message, otherReceipt) {
  if (message.status === 'sending' || message.status === 'failed') return message.status;
  if (otherReceipt && message.id <= otherReceipt.lastReadId) return 'read';
  if (otherReceipt && message.id <= otherReceipt.lastDeliveredId) return 'delivered';
  return 'sent';
}

function Ticks({ state }) {
  const label = { sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Seen', failed: 'Not sent' }[state];
  return (
    <span title={label} aria-label={label} className="inline-flex">
      {state === 'sending' && <ClockIcon className="h-3.5 w-3.5 animate-pulse" />}
      {state === 'sent' && <CheckIcon className="h-3.5 w-3.5" />}
      {state === 'delivered' && <DoubleCheckIcon className="h-4 w-4" />}
      {state === 'read' && <DoubleCheckIcon className="h-4 w-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />}
      {state === 'failed' && <AlertIcon className="h-3.5 w-3.5 text-rose-300" />}
    </span>
  );
}

export default function MessageBubble({ message, isMine, otherReceipt, groupedWithPrevious, theme, onRetry }) {
  const state = isMine ? deliveryState(message, otherReceipt) : null;
  const emojiCount = bigEmojiCount(message.body);
  const emojiSize = { 1: 'text-6xl', 2: 'text-5xl', 3: 'text-4xl' }[emojiCount];

  const meta = (
    <span className="flex items-center gap-1">
      <span>{formatMessageTime(message.createdAt)}</span>
      {isMine && <Ticks state={state} />}
    </span>
  );

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${groupedWithPrevious ? 'mt-1' : 'mt-4'}`}>
      <div className={`flex max-w-[82%] flex-col sm:max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
        {emojiCount ? (
          // Big emoji: no bubble, just a bouncy emoji and a small time underneath.
          <div className={`animate-pop-in ${state === 'failed' ? 'opacity-60' : ''}`}>
            <p className={`${emojiSize} leading-tight`}>{message.body}</p>
            <div className={`mt-1 flex text-[11px] text-zinc-400 ${isMine ? 'justify-end' : ''}`}>{meta}</div>
          </div>
        ) : (
          <div
            className={`animate-pop-in px-4 py-2.5 text-[15px] leading-relaxed shadow-lg ${
              isMine
                ? `rounded-3xl bg-gradient-to-br text-white ${theme.gradient} ${theme.glow} ${groupedWithPrevious ? '' : 'rounded-br-lg'}`
                : `rounded-3xl bg-raised text-zinc-100 shadow-black/20 ring-1 ring-line ${groupedWithPrevious ? '' : 'rounded-bl-lg'}`
            } ${state === 'failed' ? 'opacity-60' : ''}`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <div
              className={`mt-0.5 flex justify-end text-[11px] font-semibold ${isMine ? 'text-white/75' : 'text-zinc-400'}`}
            >
              {meta}
            </div>
          </div>
        )}

        {state === 'failed' && (
          <button onClick={() => onRetry(message.clientId)} className="mt-1 text-xs font-bold text-rose-300 hover:underline">
            Not sent — tap to retry 🔁
          </button>
        )}
      </div>
    </div>
  );
}
