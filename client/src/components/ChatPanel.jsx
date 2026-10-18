// Right side: the open conversation — header, message list, composer.
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket } from '../realtime/SocketContext.jsx';
import useChatMessages from '../hooks/useChatMessages.js';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import MessageList from './chat/MessageList.jsx';
import Composer from './chat/Composer.jsx';
import DisconnectModal from './DisconnectModal.jsx';
import { ArrowLeftIcon, ChatBubbleIcon, UserMinusIcon } from './Icons.jsx';

export function EmptyChatPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center text-zinc-500">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <ChatBubbleIcon className="h-8 w-8" />
      </div>
      <p className="font-medium text-zinc-300">Pick a chat</p>
      <p className="mt-1 text-sm">Choose a conversation, or tap + to invite someone.</p>
    </div>
  );
}

// Shown instead of the message box when the chat is disconnected.
function DisconnectedBanner({ chat, name, onInvite }) {
  return (
    <div className="border-t border-white/5 bg-panel/60 px-4 py-4 text-center text-sm text-zinc-400">
      {chat.disconnected.byMe ? `You disconnected from ${name}.` : `${name} disconnected from this chat.`}{' '}
      <button onClick={onInvite} className="font-medium text-accent hover:underline">
        Send a new invite
      </button>{' '}
      to chat again.
    </div>
  );
}

export default function ChatPanel({ chat, onChatsChanged, onInvite }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const name = chat.otherUser?.displayName || 'Deleted user';

  const {
    messages,
    otherReceipt,
    hasMore,
    status,
    error,
    loadingOlder,
    otherTyping,
    loadOlder,
    sendMessage,
    retryMessage,
    notifyTyping,
  } = useChatMessages(chat.id);

  // Subtitle under the name: live status first, then the username.
  let subtitle = chat.otherUser ? `@${chat.otherUser.username}` : '';
  if (chat.disconnected) subtitle = 'Disconnected';
  else if (!connected) subtitle = 'Connecting…';
  else if (otherTyping) subtitle = 'typing…';

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 bg-panel/60 px-3 py-3 backdrop-blur md:px-5">
        {/* Back button only on mobile, where the list and the chat are separate screens */}
        <Link
          to="/chats"
          aria-label="Back to chats"
          className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 md:hidden"
        >
          <ArrowLeftIcon />
        </Link>
        <Avatar name={name} seed={chat.otherUser?.id} size="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className={`truncate text-xs ${otherTyping && connected && !chat.disconnected ? 'text-accent' : 'text-zinc-500'}`}>
            {subtitle}
          </p>
        </div>
        {!chat.disconnected && (
          <button
            onClick={() => setConfirmingDisconnect(true)}
            aria-label={`Disconnect from ${name}`}
            title="Disconnect"
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-red-300"
          >
            <UserMinusIcon />
          </button>
        )}
      </header>

      {status === 'loading' && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-red-300">{error}</div>
      )}

      {status === 'ready' && (
        <MessageList
          messages={messages}
          myId={user.id}
          otherName={name}
          otherReceipt={otherReceipt}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          otherTyping={otherTyping}
          onLoadOlder={loadOlder}
          onRetry={retryMessage}
        />
      )}

      {chat.disconnected ? (
        <DisconnectedBanner chat={chat} name={name} onInvite={onInvite} />
      ) : (
        <Composer onSend={sendMessage} onTyping={notifyTyping} disabled={status !== 'ready'} />
      )}

      {confirmingDisconnect && (
        <DisconnectModal
          chat={chat}
          onClose={() => setConfirmingDisconnect(false)}
          onDisconnected={() => {
            setConfirmingDisconnect(false);
            onChatsChanged();
          }}
        />
      )}
    </div>
  );
}
