import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  async createNotification(userId: string, type: 'MENTION' | 'MESSAGE' | 'SERVER_INVITE' | 'FRIEND_REQUEST', content: string) {
    return prisma.notification.create({ data: { userId, type, content } });
  }

  async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }
}
