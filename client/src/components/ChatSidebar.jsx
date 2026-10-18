// Left column: header, search, the list of chats, and the current user at the bottom.
import { useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import { ChatBubbleIcon, LogOutIcon, PlusIcon, SearchIcon } from './Icons.jsx';
import { formatChatTime } from '../utils/formatTime.js';

function chatTitle(chat) {
  return chat.otherUser?.displayName || 'Deleted user';
}

function lastMessagePreview(chat, myId) {
  if (chat.disconnected) return 'Disconnected';
  if (!chat.lastMessage) return 'No messages yet — say hi 👋';
  const prefix = chat.lastMessage.senderId === myId ? 'You: ' : '';
  return prefix + chat.lastMessage.body;
}

function ChatListItem({ chat, myId }) {
  const unread = chat.unreadCount > 0;
  return (
    <NavLink
      to={`/chats/${chat.id}`}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
          isActive ? 'bg-accent/15' : 'hover:bg-white/5'
        }`
      }
    >
      <div className={chat.disconnected ? 'opacity-40 grayscale' : ''}>
        <Avatar name={chatTitle(chat)} seed={chat.otherUser?.id} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{chatTitle(chat)}</p>
          <span className={`shrink-0 text-xs ${unread ? 'font-medium text-accent' : 'text-zinc-500'}`}>
            {formatChatTime(chat.lastMessage?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${unread ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {lastMessagePreview(chat, myId)}
          </p>
          {unread && (
            <span
              aria-label={`${chat.unreadCount} unread`}
              className="flex h-5 min-w-5 shrink-0 animate-fade-in items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </NavLink>
  );
}

export default function ChatSidebar({ chats, loading, error, onNewChat, onOpenAccount, className = '' }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');

  const visibleChats = chats.filter((chat) =>
    chatTitle(chat).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    // Display (flex / hidden) comes from the parent's className, so it can hide us on mobile.
    <aside className={`h-dvh flex-col border-r border-white/5 bg-panel ${className}`}>
      <header className="flex items-center justify-between px-4 pb-3 pt-5">
        <h1 className="text-xl font-semibold">Chats</h1>
        <button
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="rounded-full bg-accent/15 p-2 text-accent transition hover:bg-accent/25 active:scale-95"
        >
          <PlusIcon />
        </button>
      </header>

      <div className="px-4 pb-3">
        <label className="flex items-center gap-2 rounded-xl bg-ink/60 px-3 py-2 text-zinc-500 focus-within:ring-2 focus-within:ring-accent/30">
          <SearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search chats"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
        </label>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2" aria-label="Chats">
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        {error && <p className="px-3 py-4 text-sm text-red-300">{error}</p>}
        {!loading && !error && chats.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center text-zinc-500">
            <ChatBubbleIcon className="mb-3 h-10 w-10 text-zinc-600" />
            <p className="text-sm">No chats yet.</p>
            <button onClick={onNewChat} className="mt-2 text-sm font-medium text-accent hover:underline">
              Invite someone to chat
            </button>
          </div>
        )}
        {visibleChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} myId={user.id} />
        ))}
      </nav>

      <footer className="flex items-center gap-2 border-t border-white/5 px-2 py-2">
        {/* Click your name → account settings (email for password reset) */}
        <button
          onClick={onOpenAccount}
          title="My account"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/5"
        >
          <span className="relative">
            <Avatar name={user.displayName} seed={user.id} size="h-9 w-9 text-xs" />
            {!user.email && (
              // Amber dot: no recovery email yet
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-panel bg-amber-400" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.displayName}</span>
            <span className="block truncate text-xs text-zinc-500">@{user.username}</span>
          </span>
        </button>
        <button
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-red-300"
        >
          <LogOutIcon />
        </button>
      </footer>
    </aside>
  );
}
