import { Hono } from 'hono';
import { hashPassword, verifyPassword, signJWT } from '../lib/auth';
import { newId } from '../lib/id';

type Env = { DB: D1Database; JWT_SECRET: string };

const auth = new Hono<{ Bindings: Env }>();

auth.post('/register', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (!username || !password || username.length < 2 || password.length < 6)
    return c.json({ error: 'Invalid credentials' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return c.json({ error: 'Username taken' }, 409);

  const { hash, salt } = await hashPassword(password);
  const id = newId();
  await c.env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, salt) VALUES (?, ?, ?, ?)'
  ).bind(id, username, hash, salt).run();

  const token = await signJWT({ sub: id, username }, c.env.JWT_SECRET);
  return c.json({ token, user: { id, username } });
});

auth.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  const user = await c.env.DB.prepare(
    'SELECT id, username, password_hash, salt, avatar_url FROM users WHERE username = ?'
  ).bind(username).first<{ id: string; username: string; password_hash: string; salt: string; avatar_url: string | null }>();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);
  const ok = await verifyPassword(password, user.password_hash, user.salt);
  if (!ok) return c.json({ error: 'Invalid credentials' }, 401);

  const token = await signJWT({ sub: user.id, username: user.username }, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, username: user.username, avatar_url: user.avatar_url } });
});

export default auth;
