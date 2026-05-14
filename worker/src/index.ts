import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyJWT } from './lib/auth';
import authRoutes from './routes/auth';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';

export { ChatRoom } from './durable-objects/ChatRoom';

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
};

type Variables = { userId: string; username: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', async (c, next) => {
  return cors({ origin: c.env.CORS_ORIGIN, allowHeaders: ['Authorization', 'Content-Type'] })(c, next);
});

async function authMiddleware(c: any, next: any) {
  // Regular requests use Authorization header; WebSocket upgrades pass the JWT
  // as the second subprotocol value: new WebSocket(url, ['bearer', token])
  const authHeader = c.req.header('Authorization')?.replace('Bearer ', '');
  const subprotocol = c.req.header('Sec-WebSocket-Protocol');
  const wsToken = subprotocol?.split(',').map((s: string) => s.trim()).find((s: string) => s !== 'bearer');
  const token = authHeader || wsToken;

  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Invalid token' }, 401);
  c.set('userId', payload.sub as string);
  c.set('username', payload.username as string);
  return next();
}

app.use('/api/channels/*', authMiddleware);
app.use('/api/messages/*', authMiddleware);
app.use('/api/upload/*', authMiddleware);
app.use('/api/users/*', authMiddleware);
app.use('/ws/*', authMiddleware);

app.route('/api/auth', authRoutes);
app.route('/api/channels', channelRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/users', userRoutes);

// WebSocket — routes each channelId to its own Durable Object instance
app.get('/ws/:channelId', async (c) => {
  const { channelId } = c.req.param();
  const userId = c.get('userId');
  const username = c.get('username');

  const id = c.env.CHAT_ROOM.idFromName(channelId);
  const room = c.env.CHAT_ROOM.get(id);

  const url = new URL(c.req.url);
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('userId', userId);
  url.searchParams.set('username', username);

  // Forward the WebSocket upgrade; echo back the subprotocol so the browser accepts it
  const resp = await room.fetch(new Request(url.toString(), c.req.raw));
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...Object.fromEntries(resp.headers),
      'Sec-WebSocket-Protocol': 'bearer',
    },
    webSocket: (resp as any).webSocket,
  });
});

export default app;
