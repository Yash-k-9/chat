// Three bouncing dots in a bubble, in the chat's theme color: "the other person is typing".
export default function TypingIndicator({ dotClass = 'bg-fuchsia-400' }) {
  return (
    <div className="mt-4 flex justify-start" aria-live="polite" aria-label="Typing">
      <div className="flex animate-pop-in items-center gap-1.5 rounded-3xl rounded-bl-lg bg-raised px-5 py-4 shadow-lg ring-1 ring-line">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={`h-2.5 w-2.5 animate-bounce rounded-full ${dotClass}`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
