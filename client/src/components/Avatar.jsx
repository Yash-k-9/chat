// Round avatar with the person's initials. The color is picked from their id, so the same
// person always gets the same (muted, professional) color. `online` adds a green dot.
const COLORS = [
  'bg-blue-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-orange-600',
  'bg-rose-600',
  'bg-slate-600',
  'bg-cyan-700',
  'bg-indigo-600',
];

function pickColor(seed = '') {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function initials(name = '?') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

export default function Avatar({ name, seed, size = 'h-10 w-10 text-sm', online = false, className = '' }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        aria-hidden="true"
        className={`flex select-none items-center justify-center rounded-full font-semibold text-white ${pickColor(seed || name)} ${size}`}
      >
        {initials(name)}
      </span>
      {online && (
        <span
          title="Online"
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success"
        />
      )}
    </span>
  );
}
