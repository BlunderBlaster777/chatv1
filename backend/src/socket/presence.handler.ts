import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupPresenceHandlers(io: SocketIOServer, socket: Socket, userId: string) {
  const updateStatus = async (status: string) => {
    try {
      await prisma.user.update({ where: { id: userId }, data: { status: status as any } });
      io.emit('presence:update', { userId, status });
    } catch {}
  };

  updateStatus('ONLINE');

  socket.on('presence:update', async (data: { status: string }) => {
    await updateStatus(data.status);
  });

  socket.on('server:join', (serverId: string) => {
    socket.join(`server:${serverId}`);
  });

  socket.on('disconnect', async () => {
    await updateStatus('OFFLINE');
  });
}
