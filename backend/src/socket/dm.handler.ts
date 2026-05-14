import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupDMHandlers(io: SocketIOServer, socket: Socket, userId: string) {
  socket.on('dm:message', async (data: { receiverId: string; content: string }) => {
    try {
      const content = data.content?.trim();
      if (!content || content.length > 4000) {
        socket.emit('error', { message: 'Message content is required (max 4000 characters)' });
        return;
      }
      const dm = await prisma.directMessage.create({
        data: { content, senderId: userId, receiverId: data.receiverId },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      });
      // Emit to sender and receiver via their private user rooms
      io.to(`user:${userId}`).to(`user:${data.receiverId}`).emit('dm:message', dm);
    } catch (err) {
      console.error('dm:message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('dm:typing:start', (data: { receiverId: string }) => {
    socket.to(`user:${data.receiverId}`).emit('dm:typing:start', { userId });
  });

  socket.on('dm:typing:stop', (data: { receiverId: string }) => {
    socket.to(`user:${data.receiverId}`).emit('dm:typing:stop', { userId });
  });
}
