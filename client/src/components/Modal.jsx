// Modal dialog: dimmed backdrop, centered card (a bottom sheet on phones).
// Closes on Escape or a click outside. `size`: 'md' (default) | 'lg'.
import { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

export default function Modal({ title, description, onClose, size = 'md', children }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-overlay sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92dvh] w-full animate-slide-up overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${
          size === 'lg' ? 'max-w-xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-md p-1.5 text-faint transition hover:bg-subtle hover:text-fg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
