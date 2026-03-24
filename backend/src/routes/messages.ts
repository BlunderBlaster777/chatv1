import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/:channelId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Message content required' }); return; }
    const message = await prisma.message.create({
      data: { content: content.trim(), authorId: req.userId!, channelId: req.params.channelId },
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
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Message content required' }); return; }
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
    if (message.authorId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { content: content.trim(), editedAt: new Date() },
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
    const { emoji } = req.body;
    if (!emoji) { res.status(400).json({ error: 'Emoji required' }); return; }
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
