import Spinner from './Spinner.jsx';

// Pill-shaped button with a built-in loading state (disabled + spinner while busy).
// variant: 'primary' (colorful gradient) | 'secondary' (quiet) | 'danger' (red)
const VARIANTS = {
  primary:
    'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:brightness-110',
  secondary: 'bg-raised text-zinc-200 ring-1 ring-line hover:bg-tint-strong',
  danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-400',
};

export default function Button({ loading = false, variant = 'primary', children, className = '', ...props }) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-[15px] font-semibold tracking-wide transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" tone="white" />}
      {children}
    </button>
  );
}
