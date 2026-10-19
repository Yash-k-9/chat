// Confirm "Disconnect" (unfollow): the chat becomes read-only for both people.
import { useState } from 'react';
import { api } from '../api/client.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';

const POINTS = [
  { emoji: '🔕', text: 'Neither of you can send new messages.' },
  { emoji: '📜', text: 'Your message history stays for both of you.' },
  { emoji: '💌', text: 'A new invite reconnects you anytime.' },
];

export default function DisconnectModal({ chat, onClose, onDisconnected }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const name = chat.otherUser?.displayName || 'this person';

  async function disconnect() {
    setLoading(true);
    setError('');
    try {
      await api(`/chats/${chat.id}/disconnect`, { method: 'POST' });
      onDisconnected();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <Modal title={`Disconnect from ${name}?`} emoji="👋" onClose={onClose}>
      <ul className="mb-6 space-y-2">
        {POINTS.map((point) => (
          <li key={point.text} className="flex items-center gap-3 rounded-2xl bg-raised/70 px-4 py-3 text-sm text-zinc-300">
            <span className="text-xl" aria-hidden="true">{point.emoji}</span>
            {point.text}
          </li>
        ))}
      </ul>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose}>
          Stay connected
        </Button>
        <Button variant="danger" onClick={disconnect} loading={loading}>
          Disconnect
        </Button>
      </div>
    </Modal>
  );
}
