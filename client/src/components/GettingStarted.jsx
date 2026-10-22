// "Get started" checklist for new people. Each step ticks itself off automatically;
// once all are done (or the user hides it) it disappears.
import { useState } from 'react';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { ChatBubbleIcon, CheckIcon, KeyIcon, MailIcon, UserPlusIcon } from './Icons.jsx';

const HIDDEN_KEY = 'getting-started-hidden';

function isHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function getSteps(user, chats, hasKeyBackup) {
  return [
    {
      id: 'email',
      Icon: MailIcon,
      title: 'Add a recovery email',
      text: 'So you can reset your password if you forget it.',
      done: Boolean(user.email),
      action: 'onAddEmail',
      button: 'Add',
    },
    {
      id: 'backup',
      Icon: KeyIcon,
      title: 'Back up your encryption key',
      text: 'So a new phone or browser can still read your messages.',
      done: hasKeyBackup,
      action: 'onAddEmail', // both live in Settings
      button: 'Back up',
    },
    {
      id: 'invite',
      Icon: UserPlusIcon,
      title: 'Invite someone',
      text: 'Send a private link. They join and you get a chat together.',
      done: chats.length > 0,
      action: 'onInvite',
      button: 'Invite',
    },
    {
      id: 'message',
      Icon: ChatBubbleIcon,
      title: 'Send your first message',
      text: 'Open a chat and say hello.',
      done: chats.some((chat) => chat.lastMessage),
    },
  ];
}

export default function GettingStarted({ user, chats, onAddEmail, onInvite, compact = false, className = '' }) {
  const [hidden, setHidden] = useState(isHidden);
  const { hasBackup } = useE2EE();
  const steps = getSteps(user, chats, hasBackup);
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
      aria-label="Get started"
      className={`animate-fade-in rounded-xl border border-line bg-surface shadow-sm ${compact ? 'p-3' : 'p-5'} ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>Get started</p>
          <p className="text-xs text-muted">
            {doneCount} of {steps.length} complete
          </p>
        </div>
        <button onClick={hide} className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-subtle hover:text-fg">
          Dismiss
        </button>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="divide-y divide-line">
        {steps.map(({ id, Icon, title, text, done, action, button }) => (
          <li key={id} className="flex items-center gap-3 py-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-success text-white' : 'bg-subtle text-muted'
              }`}
              aria-hidden="true"
            >
              {done ? <CheckIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${done ? 'text-faint line-through' : ''}`}>{title}</p>
              {!compact && !done && <p className="text-xs text-muted">{text}</p>}
            </div>
            {!done && action && actions[action] && (
              <button
                onClick={actions[action]}
                className="h-8 shrink-0 rounded-md border border-line px-3 text-xs font-semibold text-fg hover:bg-subtle"
              >
                {button}
              </button>
            )}
            <span className="sr-only">{done ? '(done)' : '(to do)'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
