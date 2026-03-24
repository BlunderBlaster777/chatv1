import React, { useState } from 'react';
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Username</label>
        <input
          style={inputStyle}
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          placeholder="Enter username"
          minLength={3}
        />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
      </div>
      <div>
        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="Create a password"
          minLength={8}
        />
      </div>
      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  textTransform: 'uppercase', color: '#b9bbbe', marginBottom: '8px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', background: '#202225',
  border: '1px solid #040405', borderRadius: '4px',
  color: '#dcddde', fontSize: '16px', outline: 'none',
};
const buttonStyle: React.CSSProperties = {
  width: '100%', padding: '12px', background: '#7289da',
  border: 'none', borderRadius: '4px', color: '#fff',
  fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '8px',
};
