// "Invite someone": create a one-time invite code + link.
// Whoever uses it gets a chat with you (and an account, if they're new).
import { useState } from 'react';
import { api } from '../api/client.js';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import { CheckIcon, CopyIcon } from './Icons.jsx';

const DAY_OPTIONS = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
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
      <div className="animate-fade-in space-y-4">
        <Alert tone="success">Invite created. Send it privately to one person.</Alert>

        <div>
          <p className="mb-1.5 text-sm font-medium">Invite link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              aria-label="Invite link"
              onFocus={(e) => e.target.select()}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-subtle px-3 text-sm text-muted outline-none"
            />
            <button
              onClick={copyLink}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
                copied ? 'bg-success text-white' : 'bg-accent text-white hover:bg-accent-hover'
              }`}
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Or share the code</p>
          <p className="select-all rounded-lg border border-dashed border-line bg-subtle px-3 py-2.5 text-center font-mono text-base tracking-widest">
            {invite.code}
          </p>
        </div>

        <p className="text-xs text-faint">
          Single use · expires {new Date(invite.expiresAt).toLocaleString()} · it won&apos;t be shown again
        </p>
        <Button variant="secondary" onClick={() => setInvite(null)}>
          Create another invite
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <p className="text-sm text-muted">
        Create a single-use link. Whoever opens it gets a private chat with you — and an account, if they&apos;re new.
      </p>
      <div>
        <p className="mb-2 text-sm font-medium">Link expires after</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Link expiry">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option.days}
              role="radio"
              aria-checked={days === option.days}
              onClick={() => setDays(option.days)}
              className={`h-10 rounded-lg border text-sm font-medium transition ${
                days === option.days
                  ? 'border-accent bg-accent-soft text-accent-text'
                  : 'border-line text-muted hover:bg-subtle'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={createInvite} loading={loading}>
        Create invite link
      </Button>
    </div>
  );
}
