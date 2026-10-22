// Three bouncing dots: "the other person is typing".
export default function TypingIndicator() {
  return (
    <div className="mt-3 flex justify-start" aria-live="polite" aria-label="Typing">
      <div className="flex animate-pop-in items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 shadow-sm">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-faint" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}
