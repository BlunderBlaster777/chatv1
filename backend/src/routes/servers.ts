import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createServerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

const updateServerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullish(),
  icon: z.string().url().nullish(),
});

const createChannelSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['TEXT', 'VOICE']).optional(),
});

const updateChannelSchema = z.object({
  minRole: z.enum(['MEMBER', 'ADMIN', 'OWNER']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

const ROLE_RANK: Record<string, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

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
    const parsed = createServerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }); return; }
    const { name, description } = parsed.data;
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
    const parsed = updateServerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }); return; }
    const { name, description, icon } = parsed.data;
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

// Channels — list (filtered by caller's role)
router.get('/:id/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    const userRank = member ? (ROLE_RANK[member.role] ?? 0) : 0;
    const channels = await prisma.channel.findMany({ where: { serverId: req.params.id } });
    res.json(channels.filter(c => ROLE_RANK[c.minRole] <= userRank));
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Channels — create
router.post('/:id/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createChannelSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }); return; }
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const channel = await prisma.channel.create({
      data: { name: parsed.data.name, type: parsed.data.type ?? 'TEXT', serverId: req.params.id },
    });
    res.status(201).json(channel);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Channels — update minRole
router.patch('/:id/channels/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateChannelSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid minRole value' }); return; }
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const channel = await prisma.channel.update({
      where: { id: req.params.channelId },
      data: { minRole: parsed.data.minRole },
    });
    res.json(channel);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Channels — delete
router.delete('/:id/channels/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    await prisma.channel.delete({ where: { id: req.params.channelId } });
    res.json({ message: 'Channel deleted' });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Members — add (search + instant add)
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    const caller = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const existing = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId } },
    });
    if (existing) { res.status(400).json({ error: 'Already a member' }); return; }
    const member = await prisma.serverMember.create({
      data: { serverId: req.params.id, userId, role: 'MEMBER' },
      include: { user: { select: { id: true, username: true, avatar: true, status: true, statusMessage: true } } },
    });
    res.status(201).json(member);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Members — update role
router.patch('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'role must be ADMIN or MEMBER' }); return; }
    const caller = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!caller || caller.role !== 'OWNER') {
      res.status(403).json({ error: 'Only the server owner can change roles' }); return;
    }
    const target = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.params.userId } },
    });
    if (!target || target.role === 'OWNER') {
      res.status(400).json({ error: 'Cannot change owner role' }); return;
    }
    const updated = await prisma.serverMember.update({
      where: { serverId_userId: { serverId: req.params.id, userId: req.params.userId } },
      data: { role: parsed.data.role },
      include: { user: { select: { id: true, username: true, avatar: true, status: true, statusMessage: true } } },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Members — remove
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const caller = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId! } },
    });
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const target = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: req.params.id, userId: req.params.userId } },
    });
    if (!target || target.role === 'OWNER') {
      res.status(400).json({ error: 'Cannot remove the server owner' }); return;
    }
    if (caller.role === 'ADMIN' && target.role === 'ADMIN') {
      res.status(403).json({ error: 'Admins cannot remove other admins' }); return;
    }
    await prisma.serverMember.delete({
      where: { serverId_userId: { serverId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Member removed' });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
