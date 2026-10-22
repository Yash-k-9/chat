import Spinner from './Spinner.jsx';

// Button with a built-in loading state (disabled + spinner while busy).
// variant: 'primary' (blue) | 'secondary' (outlined) | 'ghost' (text only) | 'danger' (red)
// fullWidth: true (default) stretches it; false keeps it as wide as its label.
const VARIANTS = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-fg shadow-sm hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'bg-danger text-white shadow-sm hover:opacity-90',
};

export default function Button({ loading = false, variant = 'primary', fullWidth = true, children, className = '', ...props }) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`inline-flex h-10 ${fullWidth ? 'w-full' : 'shrink-0'} items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" tone={variant === 'primary' || variant === 'danger' ? 'white' : 'accent'} />}
      {children}
    </button>
  );
}
