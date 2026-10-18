// Three bouncing dots in a bubble: "the other person is typing".
export default function TypingIndicator() {
  return (
    <div className="mt-3 flex justify-start" aria-live="polite" aria-label="Typing">
      <div className="flex animate-fade-in items-center gap-1 rounded-2xl rounded-bl-md bg-panel px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
