import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <main className="w-full flex items-center justify-center">
          <div className="auth-panel p-6 sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="auth-appmark">
                  <img src="/logo.png" alt="BlockChat logo" className="border border-white/10 bg-white/5 p-1" />
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">BlockChat</p>
                    <p className="mt-1 text-sm text-slate-400">Private group chat</p>
                  </div>
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Sign in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Continue to your channels and direct messages.
                </p>
              </div>
              <span className="brand-kicker mt-1">Live</span>
            </div>

            <LoginForm onSuccess={() => navigate('/app')} />

            <div className="mt-5 border-t border-white/8 pt-4 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-slate-200 transition-colors hover:text-white">
                Create one
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
