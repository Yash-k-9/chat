// Shows the app only once my encryption keys are ready. Otherwise shows:
//   loading       → friendly spinner
//   needs-restore → "Unlock your messages" (backup passphrase) or "Start fresh"
//   error         → retry
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useE2EE } from './E2EEContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

function StartFreshConfirm({ onCancel, onConfirm, busy }) {
  return (
    <div className="animate-pop-in space-y-4">
      <Alert tone="warning">
        <strong>Starting fresh creates new encryption keys.</strong> Messages sent before today will show as
        &ldquo;can&apos;t decrypt&rdquo; on this account, and your contacts will see that your safety number changed.
      </Alert>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Go back
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          Start fresh
        </Button>
      </div>
    </div>
  );
}

function RestoreScreen() {
  const { logout } = useAuth();
  const { restore, startFresh, hasBackup } = useE2EE();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingFresh, setConfirmingFresh] = useState(false);

  async function handleRestore(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    // Let the spinner paint before Argon2id briefly keeps the browser busy.
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await restore(passphrase);
    } catch (err) {
      setError(err.message === 'Wrong passphrase' ? "That passphrase didn't work. Check it and try again." : err.message);
      setBusy(false);
    }
  }

  async function handleStartFresh() {
    setBusy(true);
    try {
      await startFresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirmingFresh(false);
    }
  }

  return (
    <AuthLayout
      emoji="🔐"
      title="Unlock your messages"
      subtitle={
        hasBackup
          ? 'This device doesn’t have your encryption key yet. Enter your backup passphrase to bring it over.'
          : 'Your encryption key lives on another device, and there’s no backup to restore from.'
      }
      footer={
        <button onClick={logout} className="font-bold text-fuchsia-300 hover:underline">
          Log out instead
        </button>
      }
    >
      {confirmingFresh ? (
        <StartFreshConfirm onCancel={() => setConfirmingFresh(false)} onConfirm={handleStartFresh} busy={busy} />
      ) : (
        <div className="space-y-5">
          {error && <Alert>{error}</Alert>}
          {hasBackup && (
            <form onSubmit={handleRestore} className="space-y-5">
              <FormField
                label="Backup passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                hint="The one you chose under My account → Key backup (not your login password)."
                autoComplete="off"
              />
              <Button type="submit" loading={busy} disabled={!passphrase}>
                {busy ? 'Unlocking…' : 'Unlock 🔓'}
              </Button>
            </form>
          )}
          <button
            onClick={() => setConfirmingFresh(true)}
            className={`w-full text-center text-sm font-bold ${hasBackup ? 'text-zinc-400 hover:text-zinc-100' : 'rounded-full bg-raised py-3 text-zinc-100'}`}
          >
            {hasBackup ? 'Lost your passphrase? Start fresh' : 'Start fresh on this device'}
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default function KeyGate({ children }) {
  const { status, error, retry } = useE2EE();

  if (status === 'ready') return children;
  if (status === 'needs-restore') return <RestoreScreen />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {status === 'loading' ? (
        <>
          <span className="animate-float text-6xl" aria-hidden="true">🔐</span>
          <Spinner className="h-7 w-7" />
          <p className="font-display text-lg font-semibold">Getting your encryption keys ready…</p>
        </>
      ) : (
        <>
          <span className="text-6xl" aria-hidden="true">😬</span>
          <p className="font-display text-lg font-semibold">Couldn&apos;t load your encryption keys</p>
          <p className="max-w-sm text-sm text-zinc-400">{error}</p>
          <div className="w-40">
            <Button onClick={retry}>Try again</Button>
          </div>
        </>
      )}
    </div>
  );
}
