import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      // Go back to the page that sent us to login, or to the chat list.
      navigate(location.state?.from?.pathname || '/chats', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      emoji="👋"
      title="Welcome back!"
      subtitle="Your circle missed you."
      footer={
        <>
          Got an invite?{' '}
          <Link to="/register" className="font-bold text-fuchsia-300 hover:underline">
            Join the circle
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <FormField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your_username"
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <div>
          <FormField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            autoComplete="current-password"
            required
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-zinc-400 hover:text-fuchsia-300">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={submitting} disabled={!username || !password}>
          Let&apos;s go 🚀
        </Button>
      </form>
    </AuthLayout>
  );
}
