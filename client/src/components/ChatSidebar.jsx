// Left column: header, search, the list of chats, and the current user at the bottom.
import { useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { decodeContent, describeContent } from '../chat/messageContent.js';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { ChatBubbleIcon, ComposeIcon, LogOutIcon, SearchIcon, SettingsIcon } from './Icons.jsx';
import { formatChatTime } from '../utils/formatTime.js';

function chatTitle(chat) {
  return chat.otherUser?.displayName || 'Deleted user';
}

// The last message arrives encrypted like any other, so it's decrypted here for the preview.
function lastMessagePreview(chat, myId, readBody) {
  if (chat.disconnected) return 'Disconnected';
  if (!chat.lastMessage) return 'No messages yet';
  const { text } = readBody(chat.otherUser?.publicKey, { chatId: chat.id, ...chat.lastMessage });
  const prefix = chat.lastMessage.senderId === myId ? 'You: ' : '';
  return prefix + (text == null ? 'Encrypted message' : describeContent(decodeContent(text)));
}

function ChatListItem({ chat, myId, online }) {
  const { readBody } = useE2EE();
  const unread = chat.unreadCount > 0;
  return (
    <NavLink
      to={`/chats/${chat.id}`}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
          isActive ? 'bg-accent-soft' : 'hover:bg-subtle'
        }`
      }
    >
      <Avatar
        name={chatTitle(chat)}
        seed={chat.otherUser?.id}
        size="h-11 w-11 text-sm"
        online={online}
        className={chat.disconnected ? 'opacity-50 grayscale' : ''}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${unread ? 'font-semibold' : 'font-medium'}`}>{chatTitle(chat)}</p>
          <span className={`shrink-0 text-xs ${unread ? 'font-semibold text-accent' : 'text-faint'}`}>
            {formatChatTime(chat.lastMessage?.createdAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${unread ? 'text-fg' : 'text-muted'}`}>{lastMessagePreview(chat, myId, readBody)}</p>
          {unread && (
            <span
              aria-label={`${chat.unreadCount} unread`}
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </NavLink>
  );
}

function EmptyChats({ onNewChat }) {
  return (
    <div className="flex animate-fade-in flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
        <ChatBubbleIcon className="h-6 w-6 text-accent" />
      </span>
      <p className="text-sm font-semibold">No conversations yet</p>
      <p className="mt-1 text-sm text-muted">Invite someone to start your first private chat.</p>
      <button
        onClick={onNewChat}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        <ComposeIcon className="h-4 w-4" />
        New conversation
      </button>
    </div>
  );
}

const iconButton = 'rounded-lg p-2 text-muted transition hover:bg-subtle hover:text-fg';

export default function ChatSidebar({
  chats,
  loading,
  error,
  onlineUserIds = new Set(),
  onNewChat,
  onOpenAccount,
  topSlot = null,
  className = '',
}) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');

  const visibleChats = chats.filter((chat) => chatTitle(chat).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    // Display (flex / hidden) comes from the parent's className, so it can hide us on mobile.
    <aside className={`h-full flex-col border-r border-line bg-surface ${className}`}>
      <header className="flex h-16 shrink-0 items-center justify-between px-4">
        <h1 className="text-lg font-semibold tracking-tight">Chats</h1>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} aria-label="New conversation" title="New conversation" className={iconButton}>
            <ComposeIcon />
          </button>
        </div>
      </header>

      <div className="px-3 pb-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-subtle px-3 text-faint transition focus-within:border-accent focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent-soft">
          <SearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search chats"
            className="w-full bg-transparent text-sm text-fg placeholder-faint outline-none focus-visible:outline-none"
          />
        </label>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2" aria-label="Chats">
        {topSlot && <div className="px-1 py-2">{topSlot}</div>}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        {error && <p className="px-3 py-4 text-sm text-danger">{error}</p>}
        {!loading && !error && chats.length === 0 && <EmptyChats onNewChat={onNewChat} />}
        {!loading && chats.length > 0 && visibleChats.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted">No chats match “{query}”.</p>
        )}
        {visibleChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            myId={user.id}
            online={Boolean(chat.otherUser && onlineUserIds.has(chat.otherUser.id))}
          />
        ))}
      </nav>

      <footer className="flex shrink-0 items-center gap-1 border-t border-line p-2">
        <button
          onClick={onOpenAccount}
          title="Settings"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-subtle"
        >
          <span className="relative">
            <Avatar name={user.displayName} seed={user.id} size="h-9 w-9 text-xs" />
            {!user.email && (
              // Amber dot: no recovery email yet
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-warning" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.displayName}</span>
            <span className="block truncate text-xs text-faint">@{user.username}</span>
          </span>
        </button>
        <button onClick={onOpenAccount} aria-label="Settings" title="Settings" className={iconButton}>
          <SettingsIcon />
        </button>
        <ThemeToggle />
        <button
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="rounded-lg p-2 text-muted transition hover:bg-danger-soft hover:text-danger"
        >
          <LogOutIcon />
        </button>
      </footer>
    </aside>
  );
}
