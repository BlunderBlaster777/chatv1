import { Hono } from 'hono';

type Env = { DB: D1Database };
type Variables = { userId: string; username: string };

const messages = new Hono<{ Bindings: Env; Variables: Variables }>();

messages.get('/:channelId', async (c) => {
  const { channelId } = c.req.param();
  const before = c.req.query('before');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);

  const query = before
    ? `SELECT m.id, m.content, m.attachment_url, m.created_at,
              u.id as user_id, u.username, u.avatar_url
       FROM messages m JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = ? AND m.created_at < ?
       ORDER BY m.created_at DESC LIMIT ?`
    : `SELECT m.id, m.content, m.attachment_url, m.created_at,
              u.id as user_id, u.username, u.avatar_url
       FROM messages m JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = ?
       ORDER BY m.created_at DESC LIMIT ?`;

  const args = before ? [channelId, Number(before), limit] : [channelId, limit];
  const rows = await c.env.DB.prepare(query).bind(...args).all();
  return c.json(rows.results.reverse());
});

export default messages;
