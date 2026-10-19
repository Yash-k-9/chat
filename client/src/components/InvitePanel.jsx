// "Invite someone": create a one-time invite code + link.
// Whoever uses it gets a chat with you (and an account, if they're new).
import { useState } from 'react';
import { api } from '../api/client.js';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import { CheckIcon, CopyIcon } from './Icons.jsx';

const DAY_OPTIONS = [
  { days: 1, label: '1 day', emoji: '⚡' },
  { days: 3, label: '3 days', emoji: '🌤️' },
  { days: 7, label: '1 week', emoji: '📅' },
];

export default function InvitePanel() {
  const [days, setDays] = useState(3);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // /join works for both new people (→ signup) and existing members (→ accept).
  const inviteLink = invite ? `${window.location.origin}/join?code=${invite.code}` : '';

  async function createInvite() {
    setLoading(true);
    setError('');
    try {
      setInvite(await api('/invites', { method: 'POST', body: { days } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (invite) {
    return (
      <div className="animate-pop-in">
        <div className="mb-5 text-center">
          <p className="text-5xl" aria-hidden="true">🎟️</p>
          <p className="mt-2 font-display text-lg font-semibold">Your invite is ready!</p>
          <p className="text-sm text-zinc-400">Send it privately to one person.</p>
        </div>

        <button
          onClick={copyLink}
          className={`mb-4 flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-2 transition ${
            copied ? 'bg-emerald-500/10 ring-emerald-400/50' : 'bg-raised ring-transparent hover:ring-fuchsia-400/40'
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{inviteLink}</span>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              copied ? 'bg-emerald-500 text-white' : 'bg-fuchsia-500/20 text-fuchsia-200'
            }`}
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </span>
        </button>

        <p className="mb-1.5 ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Or just the code</p>
        <p className="mb-4 select-all rounded-2xl border-2 border-dashed border-line bg-ink/50 px-4 py-3 text-center font-mono text-lg tracking-widest">
          {invite.code}
        </p>
        <p className="mb-4 text-center text-xs text-zinc-500">
          Works once · expires {new Date(invite.expiresAt).toLocaleString()} · won&apos;t be shown again
        </p>
        <Button variant="secondary" onClick={() => setInvite(null)}>
          Make another invite
        </Button>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert className="mb-4">{error}</Alert>}
      <p className="mb-5 text-sm text-zinc-400">
        Create a one-time link. When someone opens it, you two get a private chat. If they&apos;re new, it also lets them
        join the circle.
      </p>
      <p className="mb-2 ml-1 text-sm font-bold text-zinc-300">Link expires in</p>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {DAY_OPTIONS.map((option) => (
          <button
            key={option.days}
            onClick={() => setDays(option.days)}
            className={`rounded-2xl px-3 py-3 text-sm font-bold transition duration-200 ${
              days === option.days
                ? 'scale-[1.03] bg-fuchsia-500/20 text-white ring-2 ring-fuchsia-400'
                : 'bg-raised text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <span className="block text-xl" aria-hidden="true">{option.emoji}</span>
            {option.label}
          </button>
        ))}
      </div>
      <Button onClick={createInvite} loading={loading}>
        Create invite link 💌
      </Button>
    </div>
  );
}
