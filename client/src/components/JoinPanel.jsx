// "Enter a code": use someone's invite → opens a chat with them.
// Also used by the /join page, with the code already filled in from the link.
import { useState } from 'react';
import { api } from '../api/client.js';
import Button from './Button.jsx';
import FormField from './FormField.jsx';

export default function JoinPanel({ initialCode = '', onChatOpened }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/invites/accept', { method: 'POST', body: { code: code.trim() } });
      onChatOpened(data.chat);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Got an invite from someone? Enter it to start a private chat with them.
      </p>
      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <FormField
        label="Invite code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" loading={loading} disabled={!code.trim()}>
        Accept invite
      </Button>
    </form>
  );
}
