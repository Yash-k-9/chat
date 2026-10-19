// ☀️ / 🌙 switch between the light and dark theme.
import { useAppearance } from '../theme/appearance.js';

export default function ThemeToggle({ className = '' }) {
  const [mode, toggle] = useAppearance();
  const dark = mode === 'dark';

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`relative flex h-9 w-16 shrink-0 items-center rounded-full p-1 ring-1 ring-line transition-colors duration-300 ${
        dark ? 'bg-indigo-950' : 'bg-yellow-100'
      } ${className}`}
    >
      {/* The sliding knob carries the icon */}
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-base shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          dark ? 'translate-x-7 bg-indigo-700' : 'translate-x-0 bg-white'
        }`}
        aria-hidden="true"
      >
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
