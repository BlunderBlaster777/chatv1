import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { authenticate, AuthRequest } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import serverRoutes from './routes/servers';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import fileRoutes from './routes/files';

const prisma = new PrismaClient();

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.resolve(config.uploadDir)));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/servers', serverRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/channels', messageRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/files', fileRoutes);

  // Direct messages routes
  app.get('/api/dms/:userId', authenticate, async (req: AuthRequest, res) => {
    try {
      const { before, limit = '50' } = req.query;
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: req.userId, receiverId: req.params.userId },
            { senderId: req.params.userId, receiverId: req.userId },
          ],
          ...(before && { createdAt: { lt: new Date(before as string) } }),
        },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
      });
      res.json(messages.reverse());
    } catch { res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/dms/:userId', authenticate, async (req: AuthRequest, res) => {
    try {
      const { content } = req.body;
      if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }
      const dm = await prisma.directMessage.create({
        data: { content: content.trim(), senderId: req.userId!, receiverId: req.params.userId },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      });
      res.status(201).json(dm);
    } catch { res.status(500).json({ error: 'Internal server error' }); }
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
