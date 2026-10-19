// Loading spinner. tone="white" for use on colorful buttons.
export default function Spinner({ className = 'h-5 w-5', tone = 'color' }) {
  const colors = tone === 'white' ? 'border-white/40 border-t-white' : 'border-fuchsia-400/25 border-t-fuchsia-400';
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[3px] ${colors} ${className}`}
    />
  );
}
