// Switch between light and dark mode. Icon button (sun / moon).
import { useAppearance } from '../theme/appearance.js';
import { MoonIcon, SunIcon } from './Icons.jsx';

export default function ThemeToggle({ className = '' }) {
  const [mode, toggle] = useAppearance();
  const dark = mode === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`rounded-lg p-2 text-muted transition hover:bg-subtle hover:text-fg ${className}`}
    >
      {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
