import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './components/Notifications/ToastNotification';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppPage from './pages/AppPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#36393f', color: '#dcddde' }}>
      Loading...
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#36393f', color: '#dcddde' }}>
      Loading...
    </div>
  );
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
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
