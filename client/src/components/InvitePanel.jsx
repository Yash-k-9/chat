// "Invite someone": create a one-time invite code + link.
// Whoever uses it gets a chat with you (and an account, if they're new).
import { useState } from 'react';
import { api } from '../api/client.js';
import Button from './Button.jsx';
import { CheckIcon, CopyIcon } from './Icons.jsx';

const DAY_OPTIONS = [1, 3, 7];

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
      <div className="animate-fade-in">
        <p className="mb-2 text-sm text-zinc-400">Share this link</p>
        <div className="mb-4 flex gap-2">
          <input
            readOnly
            value={inviteLink}
            aria-label="Invite link"
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-xl bg-ink px-3 py-2.5 text-sm text-zinc-300 outline-none"
          />
          <button
            onClick={copyLink}
            aria-label="Copy invite link"
            className="rounded-xl bg-accent/15 px-3 text-accent transition hover:bg-accent/25"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <p className="mb-2 text-sm text-zinc-400">…or just the code</p>
        <p className="mb-4 select-all rounded-xl bg-ink px-3 py-2.5 font-mono text-lg tracking-wide">
          {invite.code}
        </p>
        <p className="mb-4 text-xs text-zinc-500">
          Works once, for one person. Expires {new Date(invite.expiresAt).toLocaleString()}.
          It won't be shown again.
        </p>
        <button onClick={() => setInvite(null)} className="text-sm font-medium text-accent hover:underline">
          Create another invite
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <p className="mb-4 text-sm text-zinc-400">
        Create a one-time link. When someone opens it, you two get a private chat. If they're new,
        it also lets them create an account.
      </p>
      <p className="mb-2 text-sm font-medium text-zinc-300">Valid for</p>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {DAY_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setDays(option)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              days === option
                ? 'border-accent bg-accent/15 text-white'
                : 'border-white/10 text-zinc-400 hover:border-white/20'
            }`}
          >
            {option} {option === 1 ? 'day' : 'days'}
          </button>
        ))}
      </div>
      <Button onClick={createInvite} loading={loading}>
        Create invite link
      </Button>
    </div>
  );
}
