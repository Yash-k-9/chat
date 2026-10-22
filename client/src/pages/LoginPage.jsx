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
      title="Welcome back"
      subtitle="Log in to continue to your conversations."
      footer={
        <>
          Have an invite?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <FormField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft focus-visible:outline-none"
          />
        </div>
        <Button type="submit" loading={submitting} disabled={!username || !password}>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
