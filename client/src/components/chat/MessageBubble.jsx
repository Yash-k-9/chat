// One chat bubble. Mine: right side, gradient, with ticks. Theirs: left side, dark.
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '../Icons.jsx';
import { formatMessageTime } from '../../utils/formatTime.js';

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
      {state === 'sending' && <ClockIcon className="h-3.5 w-3.5" />}
      {state === 'sent' && <CheckIcon className="h-3.5 w-3.5" />}
      {state === 'delivered' && <DoubleCheckIcon className="h-4 w-4" />}
      {state === 'read' && <DoubleCheckIcon className="h-4 w-4 text-sky-300" />}
      {state === 'failed' && <AlertIcon className="h-3.5 w-3.5 text-red-300" />}
    </span>
  );
}

export default function MessageBubble({ message, isMine, otherReceipt, groupedWithPrevious, onRetry }) {
  const state = isMine ? deliveryState(message, otherReceipt) : null;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${groupedWithPrevious ? 'mt-0.5' : 'mt-3'}`}>
      <div className={`flex max-w-[80%] flex-col sm:max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`animate-fade-in rounded-2xl px-3.5 py-2 shadow-sm ${
            isMine
              ? 'rounded-br-md bg-gradient-to-br from-accent to-fuchsia-600 text-white'
              : 'rounded-bl-md bg-panel text-zinc-100'
          } ${state === 'failed' ? 'opacity-70' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
              isMine ? 'text-white/70' : 'text-zinc-500'
            }`}
          >
            <span>{formatMessageTime(message.createdAt)}</span>
            {isMine && <Ticks state={state} />}
          </div>
        </div>

        {state === 'failed' && (
          <button onClick={() => onRetry(message.clientId)} className="mt-1 text-xs text-red-300 hover:underline">
            Not sent — tap to retry
          </button>
        )}
      </div>
    </div>
  );
}
