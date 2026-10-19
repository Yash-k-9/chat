// "Enter a code": use someone's invite → opens a chat with them.
// Also used by the /join page, with the code already filled in from the link.
import { useState } from 'react';
import { api } from '../api/client.js';
import Button from './Button.jsx';
import FormField from './FormField.jsx';
import Alert from './Alert.jsx';

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-zinc-400">Got an invite from someone? Paste it here to start a private chat with them.</p>
      {error && <Alert>{error}</Alert>}
      <FormField
        label="Invite code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. zpSwcAnkmeU_z_D0"
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" loading={loading} disabled={!code.trim()}>
        Accept invite 🤝
      </Button>
    </form>
  );
}
