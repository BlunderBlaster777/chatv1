import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const messageContentSchema = z.object({ content: z.string().trim().min(1).max(4000) });
const reactionSchema = z.object({ emoji: z.string().trim().min(1).max(10) });

router.post('/:channelId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = messageContentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Message content required (1–4000 characters)' }); return; }
    const message = await prisma.message.create({
      data: { content: parsed.data.content, authorId: req.userId!, channelId: req.params.channelId },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        reactions: true,
        files: true,
      },
    });
    res.status(201).json(message);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = messageContentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Message content required (1–4000 characters)' }); return; }
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
    if (message.authorId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { content: parsed.data.content, editedAt: new Date() },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        reactions: true,
        files: true,
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
    if (message.authorId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ message: 'Message deleted' });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/:id/reactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = reactionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Valid emoji required' }); return; }
    const { emoji } = parsed.data;
    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId: req.params.id, userId: req.userId!, emoji } },
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      res.json({ removed: true });
    } else {
      const reaction = await prisma.reaction.create({
        data: { emoji, messageId: req.params.id, userId: req.userId! },
        include: { user: { select: { id: true, username: true } } },
      });
      res.status(201).json(reaction);
    }
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
