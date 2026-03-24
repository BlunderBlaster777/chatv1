import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, avatar: true, statusMessage: true, status: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { username, statusMessage, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username && { username }),
        ...(statusMessage !== undefined && { statusMessage }),
        ...(avatar !== undefined && { avatar }),
      },
      select: { id: true, username: true, email: true, avatar: true, statusMessage: true, status: true },
    });
    res.json(user);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, avatar: true, statusMessage: true, status: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
