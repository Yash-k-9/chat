// A labelled input with an optional hint or error message underneath.
// Extra props (type, value, onChange, autoComplete...) go straight to the <input>.
import { useId } from 'react';

export default function FormField({ label, error, hint, ...inputProps }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg placeholder-faint shadow-sm outline-none transition focus-visible:outline-none focus:ring-4 ${
          error
            ? 'border-danger focus:ring-danger-soft'
            : 'border-line focus:border-accent focus:ring-accent-soft'
        }`}
        {...inputProps}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-faint'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
