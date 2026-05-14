import { Hono } from 'hono';

type Env = { DB: D1Database };
type Variables = { userId: string };

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

users.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, username FROM users
     WHERE id != ? AND id != 'system'
     ORDER BY username ASC`
  ).bind(c.var.userId).all();
  return c.json(rows.results);
});

export default users;
