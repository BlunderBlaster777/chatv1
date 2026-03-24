import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../components/Auth/RegisterForm';

export default function RegisterPage() {
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
          Create an account
        </h1>
        <p style={{ textAlign: 'center', color: '#b9bbbe', fontSize: '16px', marginBottom: '24px' }}>
          Join the conversation today!
        </p>
        <RegisterForm onSuccess={() => navigate('/login')} />
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#72767d', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#7289da', textDecoration: 'none' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
