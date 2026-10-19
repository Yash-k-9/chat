// Right side: the open conversation — header, message list, composer.
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket } from '../realtime/SocketContext.jsx';
import useChatMessages from '../hooks/useChatMessages.js';
import { useChatTheme } from '../theme/chatThemes.js';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import MessageList from './chat/MessageList.jsx';
import Composer from './chat/Composer.jsx';
import ThemePicker from './chat/ThemePicker.jsx';
import DisconnectModal from './DisconnectModal.jsx';
import { ArrowLeftIcon, UserMinusIcon } from './Icons.jsx';

// Desktop right side when no chat is open. `checklist` = the Getting-started card (or null).
export function EmptyChatPanel({ checklist = null }) {
  return (
    // my-auto (not justify-center) keeps tall content scrollable instead of cutting off its top.
    <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <div className="my-auto flex flex-col items-center text-center">
        {checklist && <div className="mb-10 w-full max-w-lg text-left">{checklist}</div>}
        <div className="relative mb-6" aria-hidden="true">
          <span className="block animate-float text-7xl">💬</span>
          <span className="absolute -right-6 -top-2 animate-float text-3xl" style={{ animationDelay: '1s' }}>✨</span>
          <span className="absolute -left-7 bottom-0 animate-float text-3xl" style={{ animationDelay: '2s' }}>💜</span>
        </div>
        <p className="font-display text-2xl font-semibold">Pick a chat</p>
        <p className="mt-2 max-w-xs text-zinc-400">Choose a conversation on the left, or tap the big + to invite someone new.</p>
      </div>
    </div>
  );
}

// Shown instead of the message box when the chat is disconnected.
function DisconnectedBanner({ chat, name, onInvite }) {
  return (
    <div className="m-3 rounded-3xl bg-raised/80 px-5 py-4 text-center text-sm text-zinc-300">
      <span className="mr-1" aria-hidden="true">🔕</span>
      {chat.disconnected.byMe ? `You disconnected from ${name}.` : `${name} disconnected from this chat.`}{' '}
      <button onClick={onInvite} className="font-bold text-fuchsia-300 hover:underline">
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
  const [theme, themeKey, setThemeKey] = useChatTheme(chat.id);
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
  let subtitleClass = 'text-zinc-400';
  if (chat.disconnected) subtitle = '🔕 Disconnected';
  else if (!connected) subtitle = '⏳ Connecting…';
  else if (otherTyping) {
    subtitle = '✍️ typing…';
    subtitleClass = `font-bold ${theme.accentText}`;
  }

  return (
    <div className="flex h-full flex-col">
      {/* relative z-20: popovers in the header (theme picker) must float above the messages */}
      <header className="relative z-20 flex items-center gap-3 border-b border-line bg-panel/70 px-3 py-3 backdrop-blur md:px-5">
        {/* Back button only on mobile, where the list and the chat are separate screens */}
        <Link
          to="/chats"
          aria-label="Back to chats"
          className="rounded-full p-2 text-zinc-300 transition hover:bg-tint-strong md:hidden"
        >
          <ArrowLeftIcon />
        </Link>
        <Avatar name={name} seed={chat.otherUser?.id} size="h-11 w-11 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
          <p className={`truncate text-xs ${subtitleClass}`}>{subtitle}</p>
        </div>
        <ThemePicker value={themeKey} onChange={setThemeKey} />
        {!chat.disconnected && (
          <button
            onClick={() => setConfirmingDisconnect(true)}
            aria-label={`Disconnect from ${name}`}
            title="Disconnect"
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            <UserMinusIcon />
          </button>
        )}
      </header>

      {/* Dotted wallpaper tinted with the chat's theme color */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          backgroundImage: `radial-gradient(${theme.wallpaper} 1.5px, transparent 1.5px)`,
          backgroundSize: '22px 22px',
        }}
      >
        {status === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-300">😬 {error}</div>
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
            theme={theme}
            onLoadOlder={loadOlder}
            onRetry={retryMessage}
            onSend={chat.disconnected ? null : sendMessage}
          />
        )}
      </div>

      {chat.disconnected ? (
        <DisconnectedBanner chat={chat} name={name} onInvite={onInvite} />
      ) : (
        <Composer onSend={sendMessage} onTyping={notifyTyping} disabled={status !== 'ready'} theme={theme} />
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
