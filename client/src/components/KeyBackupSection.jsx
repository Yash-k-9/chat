// "Key backup" in My account: lock your encryption key with a passphrase and store the
// locked copy on the server, so a new phone/browser can unlock your messages.
import { useState } from 'react';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { MIN_PASSPHRASE_LENGTH } from '../crypto/backup.js';
import FormField from './FormField.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';

export default function KeyBackupSection() {
  const { hasBackup, saveBackup } = useE2EE();
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      return setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters — a short sentence is great.`);
    }
    if (passphrase !== confirm) return setError("The two passphrases don't match.");

    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 50)); // let the spinner paint before Argon2id
    try {
      await saveBackup(passphrase);
      setPassphrase('');
      setConfirm('');
      setOpen(false);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-raised/60 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">🔑</span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">Encryption key backup</p>
          <p className="text-sm text-zinc-400">
            {hasBackup
              ? 'Backed up ✅ You can unlock your messages on a new device with your backup passphrase.'
              : 'Not backed up yet. Without a backup, a new phone or browser can’t read your old messages.'}
          </p>
        </div>
      </div>

      {saved && <Alert tone="success" className="mt-4">Backup saved. Keep your passphrase somewhere safe!</Alert>}

      {open ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Alert tone="info">
            This passphrase is <strong>different from your login password</strong>. We never see it, so we can&apos;t
            reset it — write it down somewhere safe.
          </Alert>
          {error && <Alert>{error}</Alert>}
          <FormField
            label="Backup passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            hint={`At least ${MIN_PASSPHRASE_LENGTH} characters, e.g. “purple elephants dance at noon”`}
            autoComplete="new-password"
          />
          <FormField
            label="Repeat passphrase"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!passphrase || !confirm}>
              {busy ? 'Locking…' : 'Save backup'}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant={hasBackup ? 'secondary' : 'primary'} className="mt-4" onClick={() => { setOpen(true); setSaved(false); }}>
          {hasBackup ? 'Change backup passphrase' : 'Back up my key 🔐'}
        </Button>
      )}
    </section>
  );
}
