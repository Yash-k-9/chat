// Loading spinner. tone="white" for use on blue/red buttons.
export default function Spinner({ className = 'h-5 w-5', tone = 'accent' }) {
  const colors = tone === 'white' ? 'border-white/40 border-t-white' : 'border-line border-t-accent';
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 ${colors} ${className}`}
    />
  );
}
