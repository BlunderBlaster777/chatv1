import { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            padding: '12px 16px',
            borderRadius: '4px',
            color: '#fff',
            minWidth: '250px',
            background: toast.type === 'error' ? '#f04747' : toast.type === 'success' ? '#43b581' : '#7289da',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
