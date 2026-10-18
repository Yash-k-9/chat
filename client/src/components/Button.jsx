import Spinner from './Spinner.jsx';

// Primary button with a built-in loading state (disabled + spinner while busy).
export default function Button({ loading = false, children, className = '', ...props }) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-fuchsia-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4 text-white" />}
      {children}
    </button>
  );
}
