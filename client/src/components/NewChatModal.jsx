// "New chat": chats only start through invites, so both people agree.
// Two tabs: create an invite for someone, or use an invite you received.
import { useState } from 'react';
import Modal from './Modal.jsx';
import InvitePanel from './InvitePanel.jsx';
import JoinPanel from './JoinPanel.jsx';

const TABS = [
  { id: 'invite', label: '💌 Invite someone' },
  { id: 'join', label: '🔑 Enter a code' },
];

export default function NewChatModal({ onClose, onChatOpened }) {
  const [tab, setTab] = useState('invite');

  return (
    <Modal title="New chat" emoji="✨" onClose={onClose}>
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-raised p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-2.5 text-sm font-bold transition duration-200 ${
              tab === item.id
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === 'invite' ? <InvitePanel /> : <JoinPanel onChatOpened={onChatOpened} />}
      </div>
    </Modal>
  );
}
