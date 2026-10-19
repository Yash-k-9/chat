// Colored message box. tone: 'error' | 'success' | 'warning' | 'info'
const TONES = {
  error: { box: 'bg-rose-500/10 text-rose-200 ring-rose-400/20', icon: '😬' },
  success: { box: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20', icon: '🎉' },
  warning: { box: 'bg-amber-500/10 text-amber-100 ring-amber-400/20', icon: '💡' },
  info: { box: 'bg-sky-500/10 text-sky-100 ring-sky-400/20', icon: '💬' },
};

export default function Alert({ tone = 'error', children, className = '' }) {
  const { box, icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex animate-pop-in items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ring-1 ${box} ${className}`}
    >
      <span aria-hidden="true" className="text-base leading-5">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
