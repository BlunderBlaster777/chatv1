import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.serverMember.findMany({
      where: { userId: req.userId },
      include: { server: { include: { channels: true, _count: { select: { members: true } } } } },
    });
    res.json(memberships.map(m => m.server));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: 'Server name required' }); return; }
    const server = await prisma.server.create({
      data: {
        name,
        description,
        ownerId: req.userId!,
        members: { create: { userId: req.userId!, role: 'OWNER' } },
        channels: { create: { name: 'general', type: 'TEXT' } },
      },
      include: { channels: true, _count: { select: { members: true } } },
    });
    res.status(201).json(server);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: { channels: true, _count: { select: { members: true } } },
    });
    if (!server) { res.status(404).json({ error: 'Server not found' }); return; }
    res.json(server);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) { res.status(404).json({ error: 'Server not found' }); return; }
    if (server.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const { name, description, icon } = req.body;
    const updated = await prisma.server.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) { res.status(404).json({ error: 'Server not found' }); return; }
    if (server.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    await prisma.server.delete({ where: { id: req.params.id } });
    res.json({ message: 'Server deleted' });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const server = await prisma.server.findFirst({
      where: inviteCode ? { inviteCode } : { id: req.params.id },
    });
    if (!server) { res.status(404).json({ error: 'Server not found' }); return; }
    const existing = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: server.id, userId: req.userId! } },
    });
    if (existing) { res.status(400).json({ error: 'Already a member' }); return; }
    await prisma.serverMember.create({ data: { serverId: server.id, userId: req.userId!, role: 'MEMBER' } });
    res.json({ message: 'Joined server', serverId: server.id });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.serverMember.findMany({
      where: { serverId: req.params.id },
      include: {
        user: { select: { id: true, username: true, avatar: true, status: true, statusMessage: true } },
      },
    });
    res.json(members);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({ where: { serverId: req.params.id } });
    res.json(channels);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/:id/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type } = req.body;
    if (!name) { res.status(400).json({ error: 'Channel name required' }); return; }
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const channel = await prisma.channel.create({
      data: { name, type: type || 'TEXT', serverId: req.params.id },
    });
    res.status(201).json(channel);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
