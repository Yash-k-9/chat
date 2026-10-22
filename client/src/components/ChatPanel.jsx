// Right side: the open conversation — header, message list, composer.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket } from '../realtime/SocketContext.jsx';
import useChatMessages from '../hooks/useChatMessages.js';
import { useChatTheme } from '../theme/chatThemes.js';
import { formatLastSeen } from '../utils/formatTime.js';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import MessageList from './chat/MessageList.jsx';
import Composer from './chat/Composer.jsx';
import ThemePicker from './chat/ThemePicker.jsx';
import MediaPreviewModal from './chat/MediaPreviewModal.jsx';
import { Lightbox } from './chat/MediaView.jsx';
import { replyPreview } from './chat/MessageBubble.jsx';
import DisconnectModal from './DisconnectModal.jsx';
import DeleteChatModal from './DeleteChatModal.jsx';
import VerifyModal from './VerifyModal.jsx';
import { Menu, MenuDivider, MenuItem } from './Menu.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { clearVerified, getVerified, setVerified } from '../crypto/keyStore.js';
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  ImageIcon,
  LockIcon,
  MoreIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TimerIcon,
  TrashIcon,
  UserMinusIcon,
} from './Icons.jsx';

const DISAPPEAR_OPTIONS = [
  { seconds: null, label: 'Off' },
  { seconds: 3600, label: '1 hour' },
  { seconds: 86400, label: '24 hours' },
  { seconds: 604800, label: '7 days' },
];
const disappearLabel = (seconds) => DISAPPEAR_OPTIONS.find((o) => o.seconds === seconds)?.label ?? 'Off';

// Desktop right side when no chat is open. `checklist` = the Get-started card (or null).
export function EmptyChatPanel({ checklist = null }) {
  return (
    // my-auto (not justify-center) keeps tall content scrollable instead of cutting off its top.
    <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <div className="my-auto flex flex-col items-center text-center">
        {checklist && <div className="mb-10 w-full max-w-md text-left">{checklist}</div>}
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <ChatBubbleIcon className="h-7 w-7 text-accent" />
        </span>
        <p className="text-base font-semibold">Select a conversation</p>
        <p className="mt-1 max-w-xs text-sm text-muted">Choose a chat from the list, or start a new one with an invite.</p>
        <p className="mt-6 flex items-center gap-1.5 text-xs text-faint">
          <LockIcon className="h-3.5 w-3.5" /> Your messages are end-to-end encrypted
        </p>
      </div>
    </div>
  );
}

function Banner({ tone = 'neutral', children }) {
  const styles = {
    neutral: 'bg-subtle text-muted',
    warning: 'bg-warning-soft text-warning',
  };
  return <div className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs ${styles[tone]}`}>{children}</div>;
}

export default function ChatPanel({ chat, online, onChatsChanged, onInvite }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const { identity } = useE2EE();
  const navigate = useNavigate();
  const [theme, themeKey, setThemeKey] = useChatTheme(chat.id);
  const [modal, setModal] = useState(null); // null | 'verify' | 'disconnect'
  const [replyTo, setReplyTo] = useState(null); // { id, senderId, preview, name }
  const [pickedFile, setPickedFile] = useState(null);
  const [viewing, setViewing] = useState(null); // media open in the lightbox
  const [dragging, setDragging] = useState(false);
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
    sendText,
    sendFile,
    sendVoice,
    retryMessage,
    deleteMessage,
    react,
    notifyTyping,
  } = useChatMessages(chat.id, chat.otherUser?.publicKey);

  // Switching chats clears any half-started reply.
  useEffect(() => setReplyTo(null), [chat.id]);

  // ---- Safety number verification (stored only on this device) ----
  const peerId = chat.otherUser?.id;
  const peerKey = chat.otherUser?.publicKey;
  const [verifiedKey, setVerifiedKey] = useState(undefined); // undefined = loading, null = never verified

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

  async function setDisappearing(seconds) {
    await api(`/chats/${chat.id}/disappearing`, { method: 'PUT', body: { seconds } });
    onChatsChanged();
  }

  const canSend = !chat.disconnected && Boolean(peerKey) && status === 'ready';

  function startReply(message) {
    setReplyTo({
      id: message.id,
      senderId: message.senderId,
      preview: replyPreview(message),
      name: message.senderId === user.id ? 'yourself' : name,
    });
  }
  const replyPayload = () => (replyTo ? { id: replyTo.id, senderId: replyTo.senderId, preview: replyTo.preview } : null);

  function handleSendText(text) {
    sendText(text, replyPayload());
    setReplyTo(null);
  }
  function handleSendFile(file, caption) {
    setPickedFile(null);
    sendFile(file, caption, replyPayload()).catch(() => {});
    setReplyTo(null);
  }

  // Header status line: typing > connecting > online / last seen.
  let statusLine = chat.otherUser ? formatLastSeen(chat.otherUser.lastSeenAt) : '';
  let statusClass = 'text-muted';
  if (chat.disconnected) statusLine = 'Disconnected';
  else if (!connected) statusLine = 'Connecting…';
  else if (otherTyping) {
    statusLine = 'typing…';
    statusClass = 'text-accent font-medium';
  } else if (online) {
    statusLine = 'Online';
    statusClass = 'text-success';
  }

  // Drag & drop a photo/video anywhere on the conversation.
  const dropHandlers = canSend
    ? {
        onDragOver: (event) => {
          if ([...event.dataTransfer.types].includes('Files')) {
            event.preventDefault();
            setDragging(true);
          }
        },
        onDragLeave: (event) => event.currentTarget === event.target && setDragging(false),
        onDrop: (event) => {
          event.preventDefault();
          setDragging(false);
          const file = [...event.dataTransfer.files].find((f) => /^(image|video)\//.test(f.type));
          if (file) setPickedFile(file);
        },
      }
    : {};

  return (
    <div className="relative flex h-full flex-col" {...dropHandlers}>
      {/* relative z-20: menus in the header must float above the messages */}
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 md:px-5">
        {/* Back button only on mobile, where the list and the chat are separate screens */}
        <Link to="/chats" aria-label="Back to chats" className="rounded-lg p-2 text-muted hover:bg-subtle md:hidden">
          <ArrowLeftIcon />
        </Link>
        <Avatar name={name} seed={chat.otherUser?.id} size="h-10 w-10 text-sm" online={online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{name}</p>
          <p className={`truncate text-xs ${statusClass}`}>{statusLine}</p>
        </div>

        {peerKey && (
          <button
            onClick={() => setModal('verify')}
            title={trust === 'verified' ? 'Verified contact' : 'End-to-end encrypted — click to verify'}
            aria-label={trust === 'verified' ? 'Encryption verified' : 'Verify encryption'}
            className={`hidden h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition sm:flex ${
              trust === 'verified'
                ? 'bg-success-soft text-success'
                : trust === 'changed'
                  ? 'bg-warning-soft text-warning'
                  : 'bg-subtle text-muted hover:text-fg'
            }`}
          >
            {trust === 'verified' ? (
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            ) : trust === 'changed' ? (
              <ShieldAlertIcon className="h-3.5 w-3.5" />
            ) : (
              <LockIcon className="h-3.5 w-3.5" />
            )}
            {trust === 'verified' ? 'Verified' : trust === 'changed' ? 'Key changed' : 'Encrypted'}
          </button>
        )}

        <Menu
          width="w-64"
          trigger={(props) => (
            <button {...props} aria-label="Conversation options" className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg">
              <MoreIcon />
            </button>
          )}
        >
          {peerKey && (
            <MenuItem icon={ShieldCheckIcon} onClick={() => setModal('verify')}>
              Verify safety number
            </MenuItem>
          )}
          <div onClick={(event) => event.stopPropagation()}>
            <ThemePicker value={themeKey} onChange={setThemeKey} />
          </div>
          {!chat.disconnected && (
            <>
              <MenuDivider />
              <p className="px-3 pb-1 pt-1 text-xs font-medium text-faint">Disappearing messages</p>
              {DISAPPEAR_OPTIONS.map((option) => (
                <MenuItem key={option.label} icon={TimerIcon} onClick={() => setDisappearing(option.seconds)}>
                  <span className="flex-1">{option.label}</span>
                  {chat.disappearSeconds === option.seconds && <span className="text-xs text-accent">Current</span>}
                </MenuItem>
              ))}
              <MenuDivider />
              <MenuItem icon={UserMinusIcon} danger onClick={() => setModal('disconnect')}>
                Disconnect from {name}
              </MenuItem>
            </>
          )}
          {chat.disconnected && <MenuDivider />}
          <MenuItem icon={TrashIcon} danger onClick={() => setModal('delete')}>
            Delete chat
          </MenuItem>
        </Menu>
      </header>

      {trust === 'changed' && (
        <Banner tone="warning">
          <ShieldAlertIcon className="h-4 w-4 shrink-0" />
          <span>
            {name}&apos;s security key changed (new device, or someone in the middle).{' '}
            <button onClick={() => setModal('verify')} className="font-semibold underline">
              Verify again
            </button>
          </span>
        </Banner>
      )}
      {chat.disappearSeconds && !chat.disconnected && (
        <Banner>
          <TimerIcon className="h-3.5 w-3.5" /> New messages disappear after {disappearLabel(chat.disappearSeconds)}.
        </Banner>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-app">
        {status === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        )}
        {status === 'error' && <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-danger">{error}</div>}
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
            onReply={startReply}
            onReact={(message, emoji) => react(message, emoji).catch(() => {})}
            onDelete={(message) => deleteMessage(message).catch(() => {})}
            onOpenMedia={setViewing}
            onSend={canSend ? handleSendText : null}
          />
        )}
      </div>

      {chat.disconnected ? (
        <div className="border-t border-line bg-surface px-4 py-4 text-center text-sm text-muted">
          {chat.disconnected.byMe ? `You disconnected from ${name}.` : `${name} disconnected from this chat.`}{' '}
          <button onClick={onInvite} className="font-medium text-accent hover:underline">
            Send a new invite
          </button>{' '}
          to chat again.
        </div>
      ) : !peerKey ? (
        // Can't encrypt for someone who has no key yet, and we never send plain text.
        <div className="border-t border-line bg-surface px-4 py-4 text-center text-sm text-muted">
          Waiting for {name} to set up encryption. It happens automatically the next time they open the app.
        </div>
      ) : (
        <Composer
          onSendText={handleSendText}
          onPickFile={setPickedFile}
          onSendVoice={sendVoice}
          onTyping={notifyTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={!canSend}
        />
      )}

      {/* Drop zone overlay */}
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-accent-soft/90 text-accent-text">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm font-semibold">Drop a photo or video to send</p>
        </div>
      )}

      {pickedFile && <MediaPreviewModal file={pickedFile} onCancel={() => setPickedFile(null)} onSend={handleSendFile} />}
      {viewing && <Lightbox media={viewing} onClose={() => setViewing(null)} />}

      {modal === 'verify' && (
        <VerifyModal
          myPublicKey={identity.publicKey}
          peer={chat.otherUser}
          verified={trust === 'verified'}
          onVerify={markVerified}
          onUnverify={removeVerification}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <DeleteChatModal
          chat={chat}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setModal(null);
            navigate('/chats', { replace: true });
            onChatsChanged();
          }}
        />
      )}
      {modal === 'disconnect' && (
        <DisconnectModal
          chat={chat}
          onClose={() => setModal(null)}
          onDisconnected={() => {
            setModal(null);
            onChatsChanged();
          }}
        />
      )}
    </div>
  );
}
