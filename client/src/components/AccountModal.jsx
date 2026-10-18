// "My account": shows who you are and lets you set the email used for password resets.
import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import FormField from './FormField.jsx';
import Button from './Button.jsx';

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
    <Modal title="My account" onClose={onClose}>
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={user.displayName} seed={user.id} />
        <div className="min-w-0">
          <p className="truncate font-medium">{user.displayName}</p>
          <p className="truncate text-sm text-zinc-500">@{user.username}</p>
        </div>
      </div>

      {!user.email && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Add an email so you can reset your password if you forget it.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {saved && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Email saved.</p>}
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
          Save email
        </Button>
      </form>
    </Modal>
  );
}
