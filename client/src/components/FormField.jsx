// A labelled input with an optional hint or error message underneath.
// Extra props (type, value, onChange, autoComplete...) go straight to the <input>.
import { useId } from 'react';

export default function FormField({ label, error, hint, ...inputProps }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 ml-1 block text-sm font-bold text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`w-full rounded-2xl border-2 bg-raised/70 px-4 py-3 text-[15px] text-zinc-100 placeholder-zinc-500 outline-none transition duration-200 focus:bg-raised focus-visible:outline-none ${
          error
            ? 'border-rose-400/70 focus:border-rose-400'
            : 'border-transparent hover:border-line focus:border-fuchsia-400/70'
        }`}
        {...inputProps}
      />
      {(error || hint) && (
        <p id={messageId} className={`ml-1 mt-1.5 text-xs ${error ? 'font-semibold text-rose-300' : 'text-zinc-500'}`}>
          {error ? `⚠️ ${error}` : hint}
        </p>
      )}
    </div>
  );
}
