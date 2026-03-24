import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupChatHandlers(io: SocketIOServer, socket: Socket, userId: string) {
  socket.on('channel:join', (channelId: string) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('channel:leave', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('chat:message', async (data: { channelId: string; content: string }) => {
    try {
      const message = await prisma.message.create({
        data: { content: data.content, authorId: userId, channelId: data.channelId },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          reactions: true,
          files: true,
        },
      });
      io.to(`channel:${data.channelId}`).emit('chat:message', message);
    } catch {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('chat:edit', async (data: { messageId: string; content: string }) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: data.messageId } });
      if (!message || message.authorId !== userId) return;
      const updated = await prisma.message.update({
        where: { id: data.messageId },
        data: { content: data.content, editedAt: new Date() },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          reactions: true,
          files: true,
        },
      });
      io.to(`channel:${message.channelId}`).emit('chat:edit', updated);
    } catch {}
  });

  socket.on('chat:delete', async (data: { messageId: string }) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: data.messageId } });
      if (!message || message.authorId !== userId) return;
      await prisma.message.delete({ where: { id: data.messageId } });
      io.to(`channel:${message.channelId}`).emit('chat:delete', {
        messageId: data.messageId,
        channelId: message.channelId,
      });
    } catch {}
  });

  socket.on('chat:reaction', async (data: { messageId: string; emoji: string }) => {
    try {
      const existing = await prisma.reaction.findUnique({
        where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
      });
      const message = await prisma.message.findUnique({ where: { id: data.messageId } });
      if (!message) return;
      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.reaction.create({ data: { emoji: data.emoji, messageId: data.messageId, userId } });
      }
      const updatedMessage = await prisma.message.findUnique({
        where: { id: data.messageId },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          reactions: { include: { user: { select: { id: true, username: true } } } },
          files: true,
        },
      });
      io.to(`channel:${message.channelId}`).emit('chat:reaction', updatedMessage);
    } catch {}
  });

  socket.on('typing:start', (data: { channelId: string }) => {
    socket.to(`channel:${data.channelId}`).emit('typing:start', { userId, channelId: data.channelId });
  });

  socket.on('typing:stop', (data: { channelId: string }) => {
    socket.to(`channel:${data.channelId}`).emit('typing:stop', { userId, channelId: data.channelId });
  });
}
