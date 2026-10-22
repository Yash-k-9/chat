// Inline SVG icons in a consistent line style (Lucide-like). No icon library needed.
// They inherit the text color, so `className="h-5 w-5 text-muted"` styles them.
function Icon({ children, className = 'h-5 w-5', strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const LockIcon = (props) => (
  <Icon {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const ShieldCheckIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

export const ShieldAlertIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ComposeIcon = (props) => (
  <Icon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Icon>
);

export const LogOutIcon = (props) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const ArrowLeftIcon = (props) => (
  <Icon {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);

export const UserPlusIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" />
  </Icon>
);

export const UserMinusIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 11h6" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
);

export const CopyIcon = (props) => (
  <Icon {...props}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Icon>
);

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const DoubleCheckIcon = (props) => (
  <Icon {...props}>
    <path d="M2 12.5l4.5 4.5L17 6.5" />
    <path d="M11.5 17L22 6.5" />
  </Icon>
);

export const ChatBubbleIcon = (props) => (
  <Icon {...props}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" />
  </Icon>
);

export const SendIcon = (props) => (
  <Icon {...props}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </Icon>
);

export const ClockIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const AlertIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);

export const InfoIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const SettingsIcon = (props) => (
  <Icon {...props}>
    <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const SunIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (props) => (
  <Icon {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icon>
);

export const PaletteIcon = (props) => (
  <Icon {...props}>
    <path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-1.8a1.7 1.7 0 0 0-1.2 2.9c.5.5.7 1.1.4 1.7-.4.9-1.6 1.4-3.4 1.4z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
  </Icon>
);

export const SmileIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
  </Icon>
);

export const PaperclipIcon = (props) => (
  <Icon {...props}>
    <path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
  </Icon>
);

export const ImageIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </Icon>
);

export const VideoFileIcon = (props) => (
  <Icon {...props}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M22 8l-6 4 6 4V8z" />
  </Icon>
);

export const MicIcon = (props) => (
  <Icon {...props}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
  </Icon>
);

export const StopIcon = (props) => (
  <Icon {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </Icon>
);

export const PlayIcon = (props) => (
  <Icon {...props}>
    <path d="M7 4l13 8-13 8V4z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = (props) => (
  <Icon {...props}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </Icon>
);

export const TrashIcon = (props) => (
  <Icon {...props}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Icon>
);

export const ReplyIcon = (props) => (
  <Icon {...props}>
    <path d="M9 17l-5-5 5-5" />
    <path d="M4 12h11a5 5 0 0 1 5 5v3" />
  </Icon>
);

export const DownloadIcon = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Icon>
);

export const MailIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Icon>
);

export const KeyIcon = (props) => (
  <Icon {...props}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3L21 2M18 5l3 3M15 8l3 3" />
  </Icon>
);

export const UsersIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3" />
  </Icon>
);

export const BellIcon = (props) => (
  <Icon {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </Icon>
);

export const TimerIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2M9 2h6" />
  </Icon>
);

export const MoreIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </Icon>
);
