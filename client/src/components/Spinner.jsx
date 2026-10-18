export default function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-accent ${className}`}
    />
  );
}
