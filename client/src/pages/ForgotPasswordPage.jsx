// "Forgot password?": enter your email, get a reset link.
// The answer is the same whether or not the email exists (privacy), so we always
// show the same "check your inbox" message.
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';

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
      title="Forgot your password?"
      subtitle="We'll email you a link to set a new one"
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      {sentMessage ? (
        <div className="animate-fade-in space-y-3 text-center">
          <p className="text-3xl">📬</p>
          <p className="text-sm text-zinc-300">{sentMessage}</p>
          <p className="text-xs text-zinc-500">No email? Check spam, or try again in a couple of minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
