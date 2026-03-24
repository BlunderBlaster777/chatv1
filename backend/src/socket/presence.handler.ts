import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_STATUSES: UserStatus[] = ['ONLINE', 'OFFLINE', 'AWAY', 'DND'];

export function setupPresenceHandlers(io: SocketIOServer, socket: Socket, userId: string) {
  const updateStatus = async (status: UserStatus) => {
    try {
      await prisma.user.update({ where: { id: userId }, data: { status } });
      io.emit('presence:update', { userId, status });
    } catch (err) {
      console.error('presence:updateStatus error:', err);
    }
  };

  updateStatus('ONLINE');

  socket.on('presence:update', async (data: { status: string }) => {
    const status = data.status as UserStatus;
    if (!VALID_STATUSES.includes(status)) return;
    await updateStatus(status);
  });

  socket.on('server:join', (serverId: string) => {
    socket.join(`server:${serverId}`);
  });

  socket.on('disconnect', async () => {
    await updateStatus('OFFLINE');
  });
}
