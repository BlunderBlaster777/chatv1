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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="reg-username" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
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
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
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
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-1"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}
