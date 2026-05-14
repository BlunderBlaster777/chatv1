import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(32).optional(),
  statusMessage: z.string().trim().max(128).nullish(),
  avatar: z.string().url().nullish(),
});

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
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }); return; }
    const { username, statusMessage, avatar } = parsed.data;
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

// Search / list all users (excluding self) — used by the DM user picker
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId },
        ...(q && { username: { contains: q, mode: 'insensitive' } }),
      },
      select: { id: true, username: true, avatar: true, status: true, statusMessage: true },
      orderBy: { username: 'asc' },
      take: 50,
    });
    res.json(users);
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
