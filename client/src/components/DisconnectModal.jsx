// Confirm "Disconnect" (unfollow): the chat becomes read-only for both people.
import { useState } from 'react';
import { api } from '../api/client.js';
import Modal from './Modal.jsx';

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
      <ul className="mb-5 space-y-2 text-sm text-zinc-400">
        <li>• Neither of you can send new messages in this chat.</li>
        <li>• Your message history stays visible to both of you.</li>
        <li>• To chat again, one of you sends the other a new invite.</li>
      </ul>
      {error && <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={disconnect}
          disabled={loading}
          className="rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {loading ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    </Modal>
  );
}
