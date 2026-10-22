// Main screen. Desktop: chat list + conversation side by side, edge to edge.
// Mobile: ONE panel at a time. /chats shows the list, /chats/:chatId shows the chat.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../realtime/SocketContext.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import ChatPanel, { EmptyChatPanel } from '../components/ChatPanel.jsx';
import NewChatModal from '../components/NewChatModal.jsx';
import AccountModal from '../components/AccountModal.jsx';
import GettingStarted from '../components/GettingStarted.jsx';

export default function ChatsPage() {
  const { chatId } = useParams(); // from the URL /chats/:chatId
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'newChat' | 'account'
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());

  // The open chat, readable inside callbacks without re-creating them.
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const loadChats = useCallback(() => {
    return api('/chats')
      .then((data) => {
        // The chat that's open right now is being read, so it has no unread badge.
        // (The server may not have processed the read receipt yet.)
        setChats(data.chats.map((c) => (c.id === chatIdRef.current ? { ...c, unreadCount: 0 } : c)));
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Opening a chat clears its unread badge (the chat window sends the read receipt).
  useEffect(() => {
    if (!chatId) return;
    setChats((prev) => prev.map((c) => (c.id === chatId && c.unreadCount ? { ...c, unreadCount: 0 } : c)));
  }, [chatId]);

  // Unread count in the browser tab title: "(3) Private Chat".
  useEffect(() => {
    const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    document.title = total ? `(${total}) Private Chat` : 'Private Chat';
  }, [chats]);

  // ---- Presence: who of my contacts is online right now ----
  const refreshPresence = useCallback(() => {
    socket
      .timeout(5000)
      .emitWithAck('presence:list')
      .then((response) => response.ok && setOnlineUserIds(new Set(response.userIds)))
      .catch(() => {});
  }, [socket]);

  useSocketEvent('presence', ({ userId, online }) => {
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      if (online) next.add(userId);
      else next.delete(userId);
      return next;
    });
  });

  // ---- Live updates for the list ----

  // (Re)connected: something may have changed while we were offline.
  useSocketEvent('connect', () => {
    loadChats();
    refreshPresence();
  });
  useEffect(() => {
    if (socket.connected) refreshPresence();
  }, [socket, refreshPresence]);

  // Someone used one of our invites (or we used theirs): show the new chat.
  useSocketEvent('chat:new', () => {
    loadChats();
    refreshPresence();
  });

  // A chat changed (disconnected, new key, settings): refresh it.
  useSocketEvent('chat:updated', loadChats);

  useSocketEvent('message:new', (message) => {
    const fromOther = message.senderId !== user.id;

    // Tell the sender it reached this device (✓✓). If the chat is open,
    // the chat window marks it as READ instead, which also counts as delivered.
    if (fromOther && message.chatId !== chatId) {
      socket.emit('message:delivered', { chatId: message.chatId, messageId: message.id });
    }

    if (!chats.some((c) => c.id === message.chatId)) {
      loadChats(); // a chat we don't know yet
      return;
    }

    setChats((prev) => {
      const chat = prev.find((c) => c.id === message.chatId);
      if (!chat) return prev;
      const updated = {
        ...chat,
        lastMessage: { body: message.body, type: message.type, senderId: message.senderId, createdAt: message.createdAt },
        unreadCount: fromOther && message.chatId !== chatId ? (chat.unreadCount || 0) + 1 : chat.unreadCount,
      };
      // Move the chat to the top of the list.
      return [updated, ...prev.filter((c) => c.id !== message.chatId)];
    });
  });

  const closeModal = useCallback(() => setModal(null), []);

  // After accepting an invite: add the chat to the top of the list (if new) and open it.
  function handleChatOpened(chat) {
    setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : [chat, ...prev]));
    setModal(null);
    navigate(`/chats/${chat.id}`);
  }

  const activeChat = chats.find((chat) => chat.id === chatId);
  const checklistProps = {
    user,
    chats,
    onAddEmail: () => setModal('account'),
    onInvite: () => setModal('newChat'),
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <ChatSidebar
        chats={chats}
        loading={loading}
        error={error}
        onlineUserIds={onlineUserIds}
        onNewChat={() => setModal('newChat')}
        onOpenAccount={() => setModal('account')}
        // Phones never see the empty right panel, so the checklist goes on top of the list.
        topSlot={!loading && <GettingStarted compact className="md:hidden" {...checklistProps} />}
        // On mobile, hide the list while a chat is open.
        className={`w-full md:w-80 lg:w-[22rem] md:shrink-0 ${chatId ? 'hidden md:flex' : 'flex'}`}
      />

      <main className={`min-w-0 flex-1 overflow-hidden bg-app ${chatId ? 'block' : 'hidden md:block'}`}>
        {activeChat ? (
          <ChatPanel
            chat={activeChat}
            online={Boolean(activeChat.otherUser && onlineUserIds.has(activeChat.otherUser.id))}
            onChatsChanged={loadChats}
            onInvite={() => setModal('newChat')}
          />
        ) : chatId && !loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">This chat doesn&apos;t exist.</div>
        ) : (
          <EmptyChatPanel checklist={!loading && <GettingStarted {...checklistProps} />} />
        )}
      </main>

      {modal === 'newChat' && <NewChatModal onClose={closeModal} onChatOpened={handleChatOpened} />}
      {modal === 'account' && <AccountModal onClose={closeModal} />}
    </div>
  );
}
