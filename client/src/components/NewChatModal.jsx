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
    <Modal title="New conversation" description="Conversations start with a private invite." onClose={onClose}>
      <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`h-8 rounded-md text-sm font-medium transition ${
              tab === item.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
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
