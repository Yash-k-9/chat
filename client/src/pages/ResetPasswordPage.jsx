// /reset-password?token=...  — where the emailed link lands. Choose a new password.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const errors = {};
    if (password.length < 10) errors.password = 'At least 10 characters';
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password }, skipRefresh: true });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <Link to="/login" className="font-medium text-accent hover:underline">
      Back to log in
    </Link>
  );

  if (!token) {
    return (
      <AuthLayout title="Invalid link" footer={footer}>
        <p className="text-center text-sm text-zinc-400">
          This reset link is incomplete. Open the link from your email again, or{' '}
          <Link to="/forgot-password" className="text-accent hover:underline">request a new one</Link>.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password changed" footer={footer}>
        <div className="animate-fade-in space-y-4 text-center">
          <p className="text-3xl">✅</p>
          <p className="text-sm text-zinc-300">
            Your new password is set. For safety, you've been logged out on all devices.
          </p>
          <Link
            to="/login"
            className="block rounded-xl bg-gradient-to-r from-accent to-fuchsia-500 px-4 py-2.5 font-medium text-white"
          >
            Log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="The link works once and expires after 30 minutes" footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}{' '}
            <Link to="/forgot-password" className="underline">Request a new link</Link>
          </div>
        )}
        <FormField
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint="At least 10 characters. A short sentence works well."
          autoComplete="new-password"
        />
        <FormField
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" loading={submitting}>
          Change password
        </Button>
      </form>
    </AuthLayout>
  );
}
