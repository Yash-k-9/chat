// Shared frame for the login and signup pages: centered card with the app logo.
import { LockIcon } from './Icons.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft glowing blobs in the background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-fuchsia-500 text-white shadow-lg shadow-accent/30">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>

        <div className="rounded-3xl border border-white/5 bg-panel/80 p-6 shadow-2xl backdrop-blur">
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-sm text-zinc-400">{footer}</p>}
      </div>
    </main>
  );
}
