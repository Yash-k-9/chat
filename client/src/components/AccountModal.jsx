// Settings: profile, recovery email, encryption key backup, appearance.
import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAppearance } from '../theme/appearance.js';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import FormField from './FormField.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import KeyBackupSection from './KeyBackupSection.jsx';
import SettingsSection from './SettingsSection.jsx';
import NotificationsSection from './NotificationsSection.jsx';
import { MailIcon, MoonIcon, SunIcon } from './Icons.jsx';

function AppearanceSection() {
  const [mode, toggle] = useAppearance();
  const options = [
    { id: 'light', label: 'Light', Icon: SunIcon },
    { id: 'dark', label: 'Dark', Icon: MoonIcon },
  ];
  return (
    <SettingsSection title="Appearance" description="Choose how Private Chat looks on this device.">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
        {options.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={mode === id}
            onClick={() => mode !== id && toggle()}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition ${
              mode === id ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-muted hover:bg-subtle'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

export default function AccountModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const data = await api('/users/me/email', { method: 'PUT', body: { email: email.trim(), password } });
      updateUser(data.user);
      setPassword('');
      setSaved(true);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Settings" onClose={onClose} size="lg">
      {/* Profile */}
      <section className="flex items-center gap-4 pb-5">
        <Avatar name={user.displayName} seed={user.id} size="h-14 w-14 text-lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user.displayName}</p>
          <p className="truncate text-sm text-muted">@{user.username}</p>
        </div>
        {user.isAdmin && (
          <span className="ml-auto rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">Admin</span>
        )}
      </section>

      <SettingsSection
        icon={MailIcon}
        title="Recovery email"
        description="Used only to send password-reset links. Never shown to other people."
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {!user.email && <Alert tone="warning">Add an email so you can reset your password if you forget it.</Alert>}
          {error && <Alert>{error}</Alert>}
          {saved && <Alert tone="success">Email saved.</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <FormField
              label="Current password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" fullWidth={false} loading={saving} disabled={!email.trim() || !password}>
              Save email
            </Button>
          </div>
        </form>
      </SettingsSection>

      <KeyBackupSection />
      <NotificationsSection />
      <AppearanceSection />
    </Modal>
  );
}
