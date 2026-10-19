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
      emoji="🔑"
      title="Forgot your password?"
      subtitle="Happens to the best of us. We'll email you a reset link."
      footer={
        <Link to="/login" className="font-bold text-fuchsia-300 hover:underline">
          ← Back to log in
        </Link>
      }
    >
      {sentMessage ? (
        <div className="animate-pop-in space-y-3 py-2 text-center">
          <p className="animate-float text-6xl" aria-hidden="true">📬</p>
          <p className="font-display text-lg font-semibold">Check your inbox!</p>
          <p className="text-sm text-zinc-300">{sentMessage}</p>
          <p className="text-xs text-zinc-500">No email? Check spam, or try again in a couple of minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            Send reset link 📨
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
