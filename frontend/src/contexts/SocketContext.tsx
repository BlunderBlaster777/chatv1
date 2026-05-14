import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { runtimeConfig } from '../config/runtime';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  realtimeEnabled: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false, realtimeEnabled: runtimeConfig.realtimeEnabled });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }
    if (!runtimeConfig.realtimeEnabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    // In dev, connect to '/' (Vite proxy forwards /socket.io → backend).
    // In prod, connect directly to the backend origin via VITE_API_URL.
    const socket = io(runtimeConfig.apiOrigin || '/', { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, realtimeEnabled: runtimeConfig.realtimeEnabled }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
