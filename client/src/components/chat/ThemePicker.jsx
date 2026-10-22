// Chat color picker (used inside the chat's "more" menu).
import { CHAT_THEMES } from '../../theme/chatThemes.js';
import { CheckIcon } from '../Icons.jsx';

export default function ThemePicker({ value, onChange }) {
  return (
    <div>
      <p className="px-3 pb-2 pt-1 text-xs font-medium text-faint">Bubble color</p>
      <div className="flex flex-wrap gap-2 px-3 pb-2" role="radiogroup" aria-label="Bubble color">
        {Object.entries(CHAT_THEMES).map(([key, theme]) => (
          <button
            key={key}
            role="radio"
            aria-checked={value === key}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(key)}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${theme.swatch} ring-offset-2 ring-offset-surface transition ${
              value === key ? 'ring-2 ring-accent' : 'hover:scale-110'
            }`}
          >
            {value === key && <CheckIcon className="h-4 w-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}
