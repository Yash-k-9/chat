// A labelled input with an optional error message underneath.
// Extra props (type, value, onChange, autoComplete...) go straight to the <input>.
import { useId } from 'react';

export default function FormField({ label, error, hint, ...inputProps }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`w-full rounded-xl border bg-ink/60 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none transition focus:ring-2 ${
          error
            ? 'border-red-500/60 focus:ring-red-500/30'
            : 'border-white/10 focus:border-accent focus:ring-accent/30'
        }`}
        {...inputProps}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-1.5 text-xs ${error ? 'text-red-400' : 'text-zinc-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
