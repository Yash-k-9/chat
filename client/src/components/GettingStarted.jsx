// Friendly "Getting started" checklist for new people. Each step ticks itself off
// automatically; once all are done (or the user hides it) it disappears.
import { useState } from 'react';

const HIDDEN_KEY = 'getting-started-hidden';

function isHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function getSteps(user, chats) {
  return [
    {
      id: 'email',
      emoji: '📧',
      title: 'Add a recovery email',
      text: 'So you can reset your password if you forget it.',
      done: Boolean(user.email),
      action: 'onAddEmail',
      button: 'Add email',
    },
    {
      id: 'invite',
      emoji: '💌',
      title: 'Invite someone you love',
      text: 'Send a private link. They join and you get a chat together.',
      done: chats.length > 0,
      action: 'onInvite',
      button: 'Invite',
    },
    {
      id: 'message',
      emoji: '💬',
      title: 'Say hello',
      text: 'Open a chat and send your first message.',
      done: chats.some((chat) => chat.lastMessage),
    },
  ];
}

export default function GettingStarted({ user, chats, onAddEmail, onInvite, compact = false, className = '' }) {
  const [hidden, setHidden] = useState(isHidden);
  const steps = getSteps(user, chats);
  const doneCount = steps.filter((step) => step.done).length;
  const actions = { onAddEmail, onInvite };

  if (hidden || doneCount === steps.length) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // Not saved; it just shows again after a reload.
    }
  }

  return (
    <section
      aria-label="Getting started"
      className={`animate-pop-in rounded-[1.75rem] bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-amber-400/10 ring-1 ring-line ${
        compact ? 'p-4' : 'p-6'
      } ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={`font-display font-semibold ${compact ? 'text-base' : 'text-xl'}`}>Let&apos;s get you set up ✨</p>
          <p className="text-xs font-bold text-zinc-400">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <button onClick={hide} className="rounded-full px-2 py-1 text-xs font-bold text-zinc-400 hover:bg-tint hover:text-zinc-100">
          Hide
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-tint-strong">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-700"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${step.done ? 'opacity-60' : 'bg-panel/70'}`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                step.done ? 'bg-emerald-500 text-white' : 'bg-tint-strong'
              }`}
              aria-hidden="true"
            >
              {step.done ? '✓' : step.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${step.done ? 'line-through' : ''}`}>{step.title}</p>
              {!compact && !step.done && <p className="text-xs text-zinc-400">{step.text}</p>}
            </div>
            {!step.done && step.action && actions[step.action] && (
              <button
                onClick={actions[step.action]}
                className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-fuchsia-500/20 transition hover:-translate-y-0.5"
              >
                {step.button}
              </button>
            )}
            <span className="sr-only">{step.done ? '(done)' : '(to do)'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
