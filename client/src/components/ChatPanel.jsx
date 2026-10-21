// Right side: the open conversation — header, message list, composer.
import { useEffect, useState } from 'react';
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
import VerifyModal from './VerifyModal.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { clearVerified, getVerified, setVerified } from '../crypto/keyStore.js';
import { ArrowLeftIcon, LockIcon, UserMinusIcon } from './Icons.jsx';

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
  const { identity } = useE2EE();
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
  } = useChatMessages(chat.id, chat.otherUser?.publicKey);

  // ---- Safety number verification (stored only on this device) ----
  const peerId = chat.otherUser?.id;
  const peerKey = chat.otherUser?.publicKey;
  const [verifiedKey, setVerifiedKey] = useState(undefined); // undefined = loading, null = never verified
  const [showVerify, setShowVerify] = useState(false);

  useEffect(() => {
    if (!peerId) return;
    let cancelled = false;
    getVerified(user.id, peerId).then((record) => !cancelled && setVerifiedKey(record?.publicKey ?? null));
    return () => {
      cancelled = true;
    };
  }, [user.id, peerId]);

  // 'no-key' | 'unverified' | 'verified' | 'changed' (they have a NEW key since I verified)
  let trust = 'unverified';
  if (!peerKey) trust = 'no-key';
  else if (verifiedKey && verifiedKey === peerKey) trust = 'verified';
  else if (verifiedKey && verifiedKey !== peerKey) trust = 'changed';

  async function markVerified() {
    await setVerified(user.id, peerId, peerKey);
    setVerifiedKey(peerKey);
  }
  async function removeVerification() {
    await clearVerified(user.id, peerId);
    setVerifiedKey(null);
  }

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
        {peerKey && (
          <button
            onClick={() => setShowVerify(true)}
            title={trust === 'verified' ? 'Verified' : 'Encrypted — tap to verify'}
            aria-label={trust === 'verified' ? 'Encryption verified' : 'Verify encryption'}
            className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition hover:scale-105 ${
              trust === 'verified'
                ? 'bg-emerald-500/15 text-emerald-300'
                : trust === 'changed'
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'bg-tint-strong text-zinc-300'
            }`}
          >
            <LockIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {trust === 'verified' ? 'Verified' : trust === 'changed' ? 'Check again' : 'Encrypted'}
            </span>
          </button>
        )}
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

      {trust === 'changed' && (
        <div className="relative z-10 border-b border-line bg-amber-400/15 px-4 py-2.5 text-center text-sm text-amber-100">
          ⚠️ {name}&apos;s safety number changed — maybe a new phone, or someone in the middle.{' '}
          <button onClick={() => setShowVerify(true)} className="font-bold underline">
            Verify again
          </button>
        </div>
      )}

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
            onSend={chat.disconnected || !peerKey ? null : sendMessage}
          />
        )}
      </div>

      {chat.disconnected ? (
        <DisconnectedBanner chat={chat} name={name} onInvite={onInvite} />
      ) : !peerKey ? (
        // Can't encrypt for someone who has no key yet, and we never send plain text.
        <div className="m-3 rounded-3xl bg-raised/80 px-5 py-4 text-center text-sm text-zinc-300">
          ⏳ Waiting for {name} to set up encryption. It happens automatically the next time they open the app.
        </div>
      ) : (
        <Composer onSend={sendMessage} onTyping={notifyTyping} disabled={status !== 'ready'} theme={theme} />
      )}

      {showVerify && (
        <VerifyModal
          myPublicKey={identity.publicKey}
          peer={chat.otherUser}
          verified={trust === 'verified'}
          onVerify={markVerified}
          onUnverify={removeVerification}
          onClose={() => setShowVerify(false)}
        />
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
