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

const toastStyles: Record<Toast['type'], string> = {
  success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
  error: 'border-red-500/40 bg-red-950/80 text-red-200',
  info: 'border-violet-500/40 bg-violet-950/80 text-violet-200',
};

const toastIcons: Record<Toast['type'], string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-violet-500',
};

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
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl min-w-56 max-w-xs pointer-events-auto ${toastStyles[toast.type]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toastIcons[toast.type]}`} />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
