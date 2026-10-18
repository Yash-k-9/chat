// "New chat": chats only start through invites, so both people agree.
// Two tabs: create an invite for someone, or use an invite you received.
import { useState } from 'react';
import Modal from './Modal.jsx';
import InvitePanel from './InvitePanel.jsx';
import JoinPanel from './JoinPanel.jsx';

const TABS = [
  { id: 'invite', label: 'Invite someone' },
  { id: 'join', label: 'Enter a code' },
];

export default function NewChatModal({ onClose, onChatOpened }) {
  const [tab, setTab] = useState('invite');

  return (
    <Modal title="New chat" onClose={onClose}>
      <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink/60 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === item.id ? 'bg-panel text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'invite' ? <InvitePanel /> : <JoinPanel onChatOpened={onChatOpened} />}
    </Modal>
  );
}
