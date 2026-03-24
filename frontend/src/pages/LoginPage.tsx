import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#36393f', minHeight: '100vh',
    }}>
      <div style={{
        background: '#36393f', borderRadius: '8px', padding: '40px',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      }}>
        <h1 style={{ textAlign: 'center', color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
          Welcome back!
        </h1>
        <p style={{ textAlign: 'center', color: '#b9bbbe', fontSize: '16px', marginBottom: '24px' }}>
          We're so excited to see you again!
        </p>
        <LoginForm onSuccess={() => navigate('/app')} />
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#72767d', fontSize: '14px' }}>
          Need an account?{' '}
          <Link to="/register" style={{ color: '#7289da', textDecoration: 'none' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
