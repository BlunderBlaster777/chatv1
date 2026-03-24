import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { setupChatHandlers } from './chat.handler';
import { setupPresenceHandlers } from './presence.handler';
import { setupWebRTCHandlers } from './webrtc.handler';

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: config.frontendUrl, methods: ['GET', 'POST'], credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    socket.join(`user:${userId}`);
    setupChatHandlers(io, socket, userId);
    setupPresenceHandlers(io, socket, userId);
    setupWebRTCHandlers(io, socket, userId);
  });

  return io;
}
