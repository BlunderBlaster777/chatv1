import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { before, limit = '50' } = req.query;
    const messages = await prisma.message.findMany({
      where: {
        channelId: req.params.id,
        ...(before && { createdAt: { lt: new Date(before as string) } }),
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        reactions: { include: { user: { select: { id: true, username: true } } } },
        files: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });
    res.json(messages.reverse());
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
