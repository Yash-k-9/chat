// Settings → Encryption key backup: lock your encryption key with a passphrase and store the
// locked copy on the server, so a new phone/browser can unlock your messages.
import { useState } from 'react';
import { useE2EE } from '../crypto/E2EEContext.jsx';
import { MIN_PASSPHRASE_LENGTH } from '../crypto/backup.js';
import FormField from './FormField.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import SettingsSection from './SettingsSection.jsx';
import { KeyIcon } from './Icons.jsx';

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
      return setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters. A short sentence works well.`);
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
    <SettingsSection
      icon={KeyIcon}
      title="Encryption key backup"
      description="Lets you read your messages on a new phone or browser. Protected by a passphrase only you know."
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${hasBackup ? 'bg-success' : 'bg-warning'}`} />
          <span className="text-muted">{hasBackup ? 'Backed up' : 'Not backed up yet'}</span>
        </div>

        {saved && <Alert tone="success">Backup saved. Keep your passphrase somewhere safe.</Alert>}

        {open ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Alert tone="info">
              This passphrase is <strong>not</strong> your login password. We never see it and can&apos;t reset it —
              store it somewhere safe.
            </Alert>
            {error && <Alert>{error}</Alert>}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Backup passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                hint={`At least ${MIN_PASSPHRASE_LENGTH} characters`}
                autoComplete="new-password"
              />
              <FormField
                label="Repeat passphrase"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" fullWidth={false} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" fullWidth={false} loading={busy} disabled={!passphrase || !confirm}>
                {busy ? 'Encrypting…' : 'Save backup'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <Button
              variant={hasBackup ? 'secondary' : 'primary'}
              fullWidth={false}
              onClick={() => {
                setOpen(true);
                setSaved(false);
              }}
            >
              {hasBackup ? 'Change passphrase' : 'Back up my key'}
            </Button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
