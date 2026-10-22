// "Forgot password?": enter your email, get a reset link.
// The answer is the same whether or not the email exists (privacy), so we always
// show the same "check your inbox" message.
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';
import { MailIcon } from '../components/Icons.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
        skipRefresh: true,
      });
      setSentMessage(data.message);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a reset link."
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      {sentMessage ? (
        <div className="animate-fade-in rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <MailIcon className="h-6 w-6 text-accent" />
          </span>
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-2 text-sm text-muted">{sentMessage}</p>
          <p className="mt-3 text-xs text-faint">No email? Check your spam folder, or try again in a few minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Button type="submit" loading={submitting} disabled={!email.trim()}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
