// "My account": who you are, the email for password resets, and your encryption key backup.
import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import FormField from './FormField.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import KeyBackupSection from './KeyBackupSection.jsx';

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
    <Modal title="My account" emoji="🙂" onClose={onClose}>
      {/* Profile card */}
      <div className="mb-6 flex flex-col items-center rounded-3xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent p-5 text-center">
        <Avatar name={user.displayName} seed={user.id} size="h-20 w-20 text-2xl" />
        <p className="mt-3 font-display text-xl font-semibold">{user.displayName}</p>
        <p className="text-sm text-zinc-400">@{user.username}</p>
        {user.isAdmin && (
          <span className="mt-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200">👑 Admin</span>
        )}
      </div>

      {!user.email && (
        <Alert tone="warning" className="mb-4">
          Add an email so you can reset your password if you forget it.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {saved && <Alert tone="success">Email saved.</Alert>}
        <FormField
          label="Email (for password reset)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <FormField
          label="Current password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Needed to change your email, so nobody else can."
          autoComplete="current-password"
        />
        <Button type="submit" loading={saving} disabled={!email.trim() || !password}>
          Save email 💾
        </Button>
      </form>

      <KeyBackupSection />
    </Modal>
  );
}
