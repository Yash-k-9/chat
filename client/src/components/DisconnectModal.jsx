// Confirm "Disconnect" (unfollow): the chat becomes read-only for both people.
import { useState } from 'react';
import { api } from '../api/client.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';

const POINTS = [
  'Neither of you can send new messages in this chat.',
  'Your message history stays visible to both of you.',
  'A new invite reconnects you at any time.',
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
    <Modal title={`Disconnect from ${name}?`} onClose={onClose}>
      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" fullWidth={false} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth={false} onClick={disconnect} loading={loading}>
          Disconnect
        </Button>
      </div>
    </Modal>
  );
}
