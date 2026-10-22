import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';

// Same rules as the server (server/src/validation/authSchemas.js).
// Checking in the browser gives instant feedback; the SERVER check is the one that counts.
function validateForm(form) {
  const errors = {};
  if (!form.inviteCode.trim()) errors.inviteCode = 'Invite code is required';
  if (!/^[a-z0-9_]{3,20}$/.test(form.username.trim().toLowerCase())) {
    errors.username = '3–20 characters: letters, numbers or _';
  }
  if (!form.displayName.trim()) errors.displayName = 'Display name is required';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.password.length < 10) errors.password = 'At least 10 characters';
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match";
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    inviteCode: searchParams.get('invite') || '', // invite links look like /register?invite=CODE
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // One change handler for all inputs, using the input's "name" attribute.
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await register(form);
      // Invited by a member → open the chat with them straight away.
      navigate(data.chatId ? `/chats/${data.chatId}` : '/chats', { replace: true });
    } catch (err) {
      // Show the server's per-field errors next to the right inputs.
      const serverErrors = {};
      for (const detail of err.details || []) serverErrors[detail.field] = detail.message;
      setFieldErrors(serverErrors);
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Signup is invite-only. You'll be connected with whoever invited you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <FormField
          label="Invite code"
          name="inviteCode"
          value={form.inviteCode}
          onChange={handleChange}
          error={fieldErrors.inviteCode}
          autoComplete="off"
          spellCheck={false}
        />
        <FormField
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          error={fieldErrors.username}
          hint="Lowercase letters, numbers and _"
          autoComplete="username"
          autoCapitalize="none"
        />
        <FormField
          label="Display name"
          name="displayName"
          value={form.displayName}
          onChange={handleChange}
          error={fieldErrors.displayName}
          autoComplete="nickname"
        />
        <FormField
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          hint="Only used to reset your password. Never shown to others."
          autoComplete="email"
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          hint="At least 10 characters. A short sentence works well."
          autoComplete="new-password"
        />
        <FormField
          label="Confirm password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
