import { Hono } from 'hono';
import { newId } from '../lib/id';

type Env = { DB: D1Database };
type Variables = { userId: string; username: string };

interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_at: number;
  members?: { id: string; username: string }[];
}

const channels = new Hono<{ Bindings: Env; Variables: Variables }>();

channels.get('/', async (c) => {
  const userId = c.var.userId;

  // Public channels + any channel the user is a member of
  const rows = await c.env.DB.prepare(
    `SELECT id, name, description, type, created_at FROM channels
     WHERE type = 'public'
        OR id IN (SELECT channel_id FROM channel_members WHERE user_id = ?)
     ORDER BY created_at ASC`
  ).bind(userId).all<ChannelRow>();

  const result = rows.results;

  // Attach member list for dm/group channels so the frontend can compute display names
  const nonPublic = result.filter(c => c.type !== 'public');
  if (nonPublic.length > 0) {
    await Promise.all(nonPublic.map(async (ch) => {
      const members = await c.env.DB.prepare(
        `SELECT u.id, u.username FROM channel_members cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.channel_id = ?`
      ).bind(ch.id).all<{ id: string; username: string }>();
      ch.members = members.results;
    }));
  }

  return c.json(result);
});

channels.post('/', async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    name?: string;
    description?: string;
    type?: string;
    targetUserId?: string;   // for type='dm'
    memberIds?: string[];    // for type='group'
  }>();

  const type = body.type ?? 'public';

  // --- DM ---
  if (type === 'dm') {
    const { targetUserId } = body;
    if (!targetUserId) return c.json({ error: 'targetUserId required' }, 400);

    // Deterministic ID so two users always share the same DM channel
    const dmId = 'dm_' + [userId, targetUserId].sort().join('_');

    const existing = await c.env.DB.prepare('SELECT id FROM channels WHERE id = ?').bind(dmId).first();
    if (!existing) {
      await c.env.DB.prepare(
        `INSERT INTO channels (id, name, description, type, created_by) VALUES (?, '', NULL, 'dm', ?)`
      ).bind(dmId, userId).run();
      await c.env.DB.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').bind(dmId, userId).run();
      await c.env.DB.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').bind(dmId, targetUserId).run();
    }

    const members = await c.env.DB.prepare(
      `SELECT u.id, u.username FROM channel_members cm
       JOIN users u ON cm.user_id = u.id WHERE cm.channel_id = ?`
    ).bind(dmId).all<{ id: string; username: string }>();

    return c.json({ id: dmId, name: '', type: 'dm', members: members.results }, 200);
  }

  // --- Group chat ---
  if (type === 'group') {
    const { name, memberIds = [] } = body;
    if (!name) return c.json({ error: 'name required for group' }, 400);

    const id = newId();
    await c.env.DB.prepare(
      `INSERT INTO channels (id, name, description, type, created_by) VALUES (?, ?, ?, 'group', ?)`
    ).bind(id, name, body.description ?? null, userId).run();

    const allMembers = [...new Set([userId, ...memberIds])];
    for (const memberId of allMembers) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').bind(id, memberId).run();
    }

    const members = await c.env.DB.prepare(
      `SELECT u.id, u.username FROM channel_members cm
       JOIN users u ON cm.user_id = u.id WHERE cm.channel_id = ?`
    ).bind(id).all<{ id: string; username: string }>();

    return c.json({ id, name, type: 'group', members: members.results }, 201);
  }

  // --- Public channel ---
  const { name, description } = body;
  if (!name || !/^[a-z0-9-]+$/.test(name))
    return c.json({ error: 'Invalid channel name (lowercase, numbers, hyphens only)' }, 400);

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO channels (id, name, description, type, created_by) VALUES (?, ?, ?, 'public', ?)`
  ).bind(id, name, description ?? null, userId).run();

  return c.json({ id, name, description, type: 'public' }, 201);
});

channels.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const channel = await c.env.DB.prepare('SELECT created_by, type FROM channels WHERE id = ?')
    .bind(id).first<{ created_by: string; type: string }>();
  if (!channel) return c.json({ error: 'Not found' }, 404);
  if (channel.type === 'public' && channel.created_by !== c.var.userId)
    return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

export default channels;
