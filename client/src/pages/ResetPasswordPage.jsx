// /reset-password?token=...  — where the emailed link lands. Choose a new password.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';

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
      <AuthLayout title="Invalid reset link" footer={footer}>
        <p className="text-sm text-muted">
          This reset link is incomplete. Open the link from your email again, or{' '}
          <Link to="/forgot-password" className="font-medium text-accent hover:underline">request a new one</Link>.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password changed" footer={footer}>
        <div className="animate-fade-in space-y-5">
          <Alert tone="success">Your new password is set. For safety, you&apos;ve been logged out on all devices.</Alert>
          <Link
            to="/login"
            className="flex h-10 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
          >
            Log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="The link works once and expires after 30 minutes."
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <Alert>
            {error}{' '}
            <Link to="/forgot-password" className="font-medium underline">Request a new link</Link>
          </Alert>
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
