// Shared frame for login / signup / password / key-unlock pages.
// Desktop: dark brand panel on the left, form on the right. Phone: logo + form.
import { ChatBubbleIcon, LockIcon, UsersIcon } from './Icons.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const FEATURES = [
  { Icon: LockIcon, title: 'End-to-end encrypted', text: 'Messages and photos are locked on your device. Not even our server can read them.' },
  { Icon: UsersIcon, title: 'Invite-only', text: 'Only people you invite can join. No strangers, no ads, no tracking.' },
  { Icon: ChatBubbleIcon, title: 'Real-time', text: 'Instant delivery, read receipts and typing indicators.' },
];

export function Logo({ size = 'h-9 w-9', withName = true, nameClass = 'text-fg' }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className={`${size} rounded-lg`} />
      {withName && <span className={`text-lg font-semibold tracking-tight ${nameClass}`}>Private Chat</span>}
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      {/* soft blue glow + fine grid for depth */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative">
        <Logo nameClass="text-white" />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
          Private conversations for the people who matter.
        </h2>
        <ul className="mt-10 space-y-6">
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-blue-300" />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-slate-500">Built with libsodium · X25519 · XChaCha20-Poly1305</p>
    </aside>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <BrandPanel />

      <section className="relative flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:hidden">
            <Logo />
          </span>
          <ThemeToggle className="ml-auto" />
        </div>

        <div className="mx-auto my-auto w-full max-w-sm animate-slide-up py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
