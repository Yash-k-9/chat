// Confirm "Delete chat" — removes the conversation from MY list only.
import { useState } from 'react';
import { api } from '../api/client.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';

export default function DeleteChatModal({ chat, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const name = chat.otherUser?.displayName || 'this person';

  async function remove() {
    setLoading(true);
    setError('');
    try {
      await api(`/chats/${chat.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <Modal title={`Delete chat with ${name}?`} onClose={onClose}>
      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-muted">
        <li>The conversation and its history are removed from <strong className="text-fg">your</strong> chat list.</li>
        <li>You&apos;re disconnected: neither of you can send new messages.</li>
        <li>{name} keeps their copy of the conversation.</li>
        <li>To talk again, send a new invite — the chat will start empty for you.</li>
      </ul>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" fullWidth={false} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth={false} onClick={remove} loading={loading}>
          Delete chat
        </Button>
      </div>
    </Modal>
  );
}
