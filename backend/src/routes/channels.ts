import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { before } = req.query;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
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
      take: limit,
    });
    res.json(messages.reverse());
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
