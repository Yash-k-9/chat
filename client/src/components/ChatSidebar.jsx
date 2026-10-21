// Left column: greeting, search, the list of chats, and the current user at the bottom.
import { useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import Avatar from './Avatar.jsx';
import Spinner from './Spinner.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { LogOutIcon, PlusIcon, SearchIcon } from './Icons.jsx';
import { formatChatTime } from '../utils/formatTime.js';

function chatTitle(chat) {
  return chat.otherUser?.displayName || 'Deleted user';
}

// The last message arrives encrypted like any other, so it's decrypted here for the preview.
function lastMessagePreview(chat, myId, readBody) {
  if (chat.disconnected) return '🔕 Disconnected';
  if (!chat.lastMessage) return 'Say hi 👋';
  const { text } = readBody(chat.otherUser?.publicKey, { chatId: chat.id, ...chat.lastMessage });
  const prefix = chat.lastMessage.senderId === myId ? 'You: ' : '';
  return prefix + (text ?? '🔐 Encrypted message');
}

function ChatListItem({ chat, myId }) {
  const { readBody } = useE2EE();
  const unread = chat.unreadCount > 0;
  return (
    <NavLink
      to={`/chats/${chat.id}`}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-3xl px-3 py-3 transition duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-fuchsia-500/20 to-violet-500/10 ring-1 ring-fuchsia-400/30'
            : 'hover:bg-tint'
        }`
      }
    >
      <div className={`transition group-hover:scale-105 ${chat.disconnected ? 'opacity-40 grayscale' : ''}`}>
        <Avatar name={chatTitle(chat)} seed={chat.otherUser?.id} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-[17px] font-medium">{chatTitle(chat)}</p>
          <span className={`shrink-0 text-xs ${unread ? 'font-bold text-pink-300' : 'text-zinc-500'}`}>
            {formatChatTime(chat.lastMessage?.createdAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${unread ? 'font-bold text-zinc-100' : 'text-zinc-400'}`}>
            {lastMessagePreview(chat, myId, readBody)}
          </p>
          {unread && (
            <span
              aria-label={`${chat.unreadCount} unread`}
              className="flex h-6 min-w-6 shrink-0 animate-pop-in items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-2 text-xs font-extrabold text-white shadow-md shadow-pink-500/30"
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
      <div className="mb-4 animate-float text-6xl" aria-hidden="true">💌</div>
      <p className="font-display text-lg font-semibold">No chats yet</p>
      <p className="mt-1 text-sm text-zinc-400">Invite your favourite people to start chatting.</p>
      <button
        onClick={onNewChat}
        className="mt-5 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-5 py-2.5 font-display font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:-translate-y-0.5"
      >
        Invite someone ✨
      </button>
    </div>
  );
}

export default function ChatSidebar({ chats, loading, error, onNewChat, onOpenAccount, topSlot = null, className = '' }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');

  const visibleChats = chats.filter((chat) =>
    chatTitle(chat).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const firstName = user.displayName.split(' ')[0];

  return (
    // Display (flex / hidden) comes from the parent's className, so it can hide us on mobile.
    <aside
      className={`h-full flex-col overflow-hidden bg-panel/85 backdrop-blur md:rounded-[2rem] md:border md:border-line ${className}`}
    >
      <header className="flex items-end justify-between px-5 pb-4 pt-6">
        <div>
          <p className="text-sm font-semibold text-zinc-400">Hey {firstName} 👋</p>
          <h1 className="font-display text-3xl font-semibold">Chats</h1>
        </div>
        <button
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30 transition duration-300 hover:rotate-90 hover:scale-105 active:scale-95"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </header>

      <div className="px-4 pb-3">
        <label className="flex items-center gap-2.5 rounded-full bg-raised/70 px-4 py-2.5 text-zinc-500 ring-2 ring-transparent transition focus-within:bg-raised focus-within:ring-fuchsia-400/50">
          <SearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none focus-visible:outline-none"
          />
        </label>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2" aria-label="Chats">
        {topSlot && <div className="px-1 pb-2">{topSlot}</div>}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-7 w-7" />
          </div>
        )}
        {error && <p className="px-4 py-4 text-sm text-rose-300">😬 {error}</p>}
        {!loading && !error && chats.length === 0 && <EmptyChats onNewChat={onNewChat} />}
        {!loading && chats.length > 0 && visibleChats.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">No chats match “{query}” 🔍</p>
        )}
        {visibleChats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} myId={user.id} />
        ))}
      </nav>

      <footer className="m-3 flex items-center gap-1 rounded-3xl bg-raised/60 p-1.5">
        {/* Click your name → account settings (email for password reset) */}
        <button
          onClick={onOpenAccount}
          title="My account"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] px-2 py-1.5 text-left transition hover:bg-tint"
        >
          <span className="relative">
            <Avatar name={user.displayName} seed={user.id} size="h-10 w-10 text-sm" />
            {!user.email && (
              // Amber dot: no recovery email yet
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-raised bg-amber-400" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display font-medium">{user.displayName}</span>
            <span className="block truncate text-xs text-zinc-400">@{user.username}</span>
          </span>
        </button>
        <ThemeToggle />
        <button
          onClick={logout}
          aria-label="Log out"
          title="Log out"
          className="rounded-full p-2.5 text-zinc-400 transition hover:bg-rose-500/15 hover:text-rose-300"
        >
          <LogOutIcon />
        </button>
      </footer>
    </aside>
  );
}
