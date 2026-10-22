// "14:05" — time under a message bubble.
export function formatMessageTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// "Today", "Yesterday", or "Mon, 12 Oct" — separators between days in a chat.
export function formatDayLabel(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

// "last seen 5 min ago" / "last seen today at 14:05" / "last seen 12 Oct"
export function formatLastSeen(isoDate) {
  if (!isoDate) return 'Offline';
  const date = new Date(isoDate);
  const minutes = Math.round((Date.now() - date) / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  if (date.toDateString() === new Date().toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

// Chat-list style time: "14:05" today, "Mon" this week, "12/10/26" older.
export function formatChatTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const daysAgo = (now - date) / (24 * 60 * 60 * 1000);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (daysAgo < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}
