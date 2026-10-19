// Round avatar with the person's initials on a colorful gradient. The color is
// picked from their id, so the same person always gets the same color.
const GRADIENTS = [
  'from-violet-400 to-fuchsia-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-300 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-lime-300 to-emerald-500',
  'from-fuchsia-400 to-purple-600',
];

function pickGradient(seed = '') {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

function initials(name = '?') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

export default function Avatar({ name, seed, size = 'h-12 w-12 text-base', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold text-white shadow-md ring-2 ring-line ${pickGradient(seed || name)} ${size} ${className}`}
    >
      {initials(name)}
    </div>
  );
}
