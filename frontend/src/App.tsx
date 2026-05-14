import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './components/Notifications/ToastNotification';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppPage from './pages/AppPage';
import DMPage from './pages/DMPage';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500 text-sm">
      Loading…
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? <>{children}</> : <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/app" element={<PrivateRoute><AppPage /></PrivateRoute>} />
              <Route path="/app/dm" element={<PrivateRoute><DMPage /></PrivateRoute>} />
              <Route path="/app/dm/:userId" element={<PrivateRoute><DMPage /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
