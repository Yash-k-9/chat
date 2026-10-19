// Modal dialog: dark blurred overlay, bouncy panel. Closes on Escape or a click outside.
// On phones it slides up from the bottom like a sheet.
import { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

export default function Modal({ title, emoji, onClose, children }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-overlay backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-md animate-slide-up overflow-y-auto rounded-t-[2rem] border border-line bg-panel p-6 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            {emoji && <span className="text-2xl">{emoji}</span>}
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-raised p-2 text-zinc-400 transition hover:rotate-90 hover:text-zinc-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
