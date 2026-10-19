// Shared frame for login / signup / password pages.
// Desktop: colorful hero on the left, form on the right. Phone: compact header + form.
import { LockIcon } from './Icons.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// Little chat bubbles floating around the hero.
const FLOATING_BUBBLES = [
  { text: 'hey!! 👋', className: 'left-[8%] top-[18%] bg-white text-zinc-800', delay: '0s' },
  { text: 'dinner at 8? 🍕', className: 'right-[10%] top-[30%] bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white', delay: '1.2s' },
  { text: 'on my way 🚗', className: 'left-[12%] top-[46%] bg-gradient-to-r from-sky-400 to-indigo-500 text-white', delay: '2.4s' },
  { text: '😂😂', className: 'right-[16%] bottom-[18%] bg-white text-zinc-800', delay: '0.6s' },
];

const FEATURES = [
  { emoji: '🔒', text: 'End-to-end encrypted' },
  { emoji: '💌', text: 'Invite-only circle' },
  { emoji: '⚡', text: 'Real-time chat' },
];

function Logo({ size = 'h-12 w-12' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30 ${size}`}
    >
      <LockIcon className="h-1/2 w-1/2" />
    </div>
  );
}

function Hero() {
  return (
    <aside className="relative hidden overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-10 lg:flex lg:flex-col lg:justify-between">
      {/* soft light blobs */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <Logo size="h-11 w-11" />
        <span className="font-display text-2xl font-semibold">Private Chat</span>
      </div>

      {FLOATING_BUBBLES.map((bubble) => (
        <div
          key={bubble.text}
          aria-hidden="true"
          style={{ animationDelay: bubble.delay }}
          className={`absolute animate-float rounded-3xl px-4 py-2.5 font-bold shadow-xl ${bubble.className}`}
        >
          {bubble.text}
        </div>
      ))}

      <div className="relative">
        <h2 className="font-display text-5xl font-semibold leading-tight">
          Your people.
          <br />
          Your place. 💜
        </h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {FEATURES.map((feature) => (
            <li key={feature.text} className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
              {feature.emoji} {feature.text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function AuthLayout({ emoji, title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-dvh gap-6 p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:p-6">
      <Hero />

      <section className="relative flex items-center justify-center py-6">
        <ThemeToggle className="absolute right-0 top-0" />
        <div className="w-full max-w-md animate-slide-up">
          {/* Phone-only brand header */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <Logo size="h-10 w-10" />
            <span className="font-display text-xl font-semibold">Private Chat</span>
          </div>

          <div className="mb-6 text-center lg:text-left">
            {emoji && (
              <div className="mb-3 inline-block animate-wiggle text-5xl" aria-hidden="true">
                {emoji}
              </div>
            )}
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-zinc-400">{subtitle}</p>}
          </div>

          <div className="rounded-[2rem] border border-line bg-panel/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
