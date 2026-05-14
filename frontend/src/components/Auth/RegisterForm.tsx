import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Notifications/ToastNotification';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, email, password);
      showToast('Account created! Please log in.', 'success');
      onSuccess?.();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="reg-username" className="auth-label">
          Username
        </label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          placeholder="yourname"
          minLength={3}
          className="auth-input"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="auth-label">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="auth-input"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="auth-label">
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          minLength={8}
          className="auth-input"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="brand-button mt-1"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}
