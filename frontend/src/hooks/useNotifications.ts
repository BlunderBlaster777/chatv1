import { useEffect, useCallback } from 'react';

export function useNotifications() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: icon || '/vite.svg' });
    }
  }, []);

  return { showNotification };
}
