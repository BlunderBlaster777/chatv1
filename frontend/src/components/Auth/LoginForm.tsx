import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Notifications/ToastNotification';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="login-email" className="auth-label">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="auth-input"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="auth-label">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="auth-input"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="brand-button mt-1"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
