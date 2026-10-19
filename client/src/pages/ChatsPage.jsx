// Main screen. Desktop: sidebar + chat side by side.
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

  // ---- Live updates for the list ----

  // (Re)connected: something may have changed while we were offline.
  useSocketEvent('connect', loadChats);

  // Someone used one of our invites (or we used theirs): show the new chat.
  useSocketEvent('chat:new', loadChats);

  // A chat changed, e.g. someone disconnected: refresh so it shows as read-only.
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

  return (
    // Phone: edge-to-edge single panel. Desktop: two floating rounded cards with a gap.
    <div className="flex h-dvh gap-3 overflow-hidden md:p-3">
      <ChatSidebar
        chats={chats}
        loading={loading}
        error={error}
        onNewChat={() => setModal('newChat')}
        onOpenAccount={() => setModal('account')}
        // Phones never see the empty right panel, so the checklist goes on top of the list.
        topSlot={
          !loading && (
            <GettingStarted
              compact
              className="md:hidden"
              user={user}
              chats={chats}
              onAddEmail={() => setModal('account')}
              onInvite={() => setModal('newChat')}
            />
          )
        }
        // On mobile, hide the list while a chat is open.
        className={`w-full md:w-80 lg:w-96 md:shrink-0 ${chatId ? 'hidden md:flex' : 'flex'}`}
      />

      <main
        className={`min-w-0 flex-1 overflow-hidden bg-panel/40 md:rounded-[2rem] md:border md:border-line ${
          chatId ? 'block' : 'hidden md:block'
        }`}
      >
        {activeChat ? (
          <ChatPanel chat={activeChat} onChatsChanged={loadChats} onInvite={() => setModal('newChat')} />
        ) : chatId && !loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <span className="text-5xl" aria-hidden="true">🫥</span>
            Chat not found.
          </div>
        ) : (
          <EmptyChatPanel
            checklist={
              !loading && (
                <GettingStarted
                  user={user}
                  chats={chats}
                  onAddEmail={() => setModal('account')}
                  onInvite={() => setModal('newChat')}
                />
              )
            }
          />
        )}
      </main>

      {modal === 'newChat' && <NewChatModal onClose={closeModal} onChatOpened={handleChatOpened} />}
      {modal === 'account' && <AccountModal onClose={closeModal} />}
    </div>
  );
}
