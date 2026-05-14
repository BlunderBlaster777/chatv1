import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FRONTEND_URL?: string;
  APP_MODE?: string;
};

type Variables = {
  userId: string;
};

type SqlClient = ReturnType<typeof neon>;

type ServerRole = 'OWNER' | 'ADMIN' | 'MEMBER';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(32).optional(),
  statusMessage: z.string().trim().max(128).nullish(),
  avatar: z.string().url().nullish(),
});

const createServerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
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

const messageContentSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

const dmSendSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(10),
});

const ROLE_RANK: Record<ServerRole, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

function getSql(env: Bindings): SqlClient {
  return neon(env.DATABASE_URL);
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function sanitizeOrigin(origin: string | undefined, frontendUrl: string | undefined) {
  if (!origin) return frontendUrl ?? '*';
  if (!frontendUrl) return origin;
  return origin === frontendUrl ? origin : frontendUrl;
}

async function requireUserId(c: Parameters<typeof app.use>[0] extends never ? never : any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(authHeader.slice(7), c.env.JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  return cors({
    origin: sanitizeOrigin(origin, c.env.FRONTEND_URL),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

app.use('/api/*', async (c, next) => {
  const userId = await requireUserId(c);
  if (userId) c.set('userId', userId);
  await next();
});

app.get('/health', (c) => c.json({
  status: 'ok',
  mode: c.env.APP_MODE ?? 'cloudflare',
  realtime: false,
  uploads: false,
}));

app.post('/api/auth/register', async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const sql = getSql(c.env);
  const { username, email, password } = parsed.data;
  const existing = await sql`
    SELECT id
    FROM "User"
    WHERE email = ${email} OR username = ${username}
    LIMIT 1
  `;

  if (existing.length > 0) return jsonError(400, 'Username or email already in use');

  const passwordHash = await bcrypt.hash(password, 12);
  const createdUsers = await sql`
    INSERT INTO "User" (id, username, email, "passwordHash")
    VALUES (${crypto.randomUUID()}, ${username}, ${email}, ${passwordHash})
    RETURNING id, username, email, avatar, status, "createdAt"
  `;

  return c.json({ user: createdUsers[0] }, 201);
});

app.post('/api/auth/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Email and password are required');

  const sql = getSql(c.env);
  const users = await sql`
    SELECT id, username, email, avatar, "passwordHash"
    FROM "User"
    WHERE email = ${parsed.data.email}
    LIMIT 1
  `;
  const user = users[0] as Record<string, string> | undefined;
  if (!user) return jsonError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return jsonError(401, 'Invalid credentials');

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const accessToken = jwt.sign({ userId: user.id }, c.env.JWT_SECRET, { expiresIn: '15m' });

  await sql`
    INSERT INTO "RefreshToken" (id, token, "userId", "expiresAt")
    VALUES (${crypto.randomUUID()}, ${refreshToken}, ${user.id}, ${expiresAt})
  `;
  await sql`UPDATE "User" SET status = ${'ONLINE'}::"UserStatus" WHERE id = ${user.id}`;

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: 'ONLINE',
    },
  });
});

app.post('/api/auth/logout', async (c) => {
  const body = await c.req.json().catch(() => null) as { refreshToken?: string } | null;
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return c.json({ message: 'Logged out' });

  const sql = getSql(c.env);
  const tokens = await sql`
    SELECT token, "userId"
    FROM "RefreshToken"
    WHERE token = ${refreshToken}
    LIMIT 1
  `;

  if (tokens.length > 0) {
    await sql`UPDATE "User" SET status = ${'OFFLINE'}::"UserStatus" WHERE id = ${tokens[0].userId}`;
    await sql`DELETE FROM "RefreshToken" WHERE token = ${refreshToken}`;
  }

  return c.json({ message: 'Logged out' });
});

app.post('/api/auth/refresh', async (c) => {
  const body = await c.req.json().catch(() => null) as { refreshToken?: string } | null;
  if (!body?.refreshToken) return jsonError(400, 'Refresh token required');

  const sql = getSql(c.env);
  const tokens = await sql`
    SELECT token, "userId", "expiresAt"
    FROM "RefreshToken"
    WHERE token = ${body.refreshToken}
    LIMIT 1
  `;
  const tokenRecord = tokens[0] as { token: string; userId: string; expiresAt: string } | undefined;
  if (!tokenRecord || new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
    return jsonError(401, 'Invalid refresh token');
  }

  const newRefreshToken = crypto.randomUUID();
  const accessToken = jwt.sign({ userId: tokenRecord.userId }, c.env.JWT_SECRET, { expiresIn: '15m' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`DELETE FROM "RefreshToken" WHERE token = ${body.refreshToken}`;
  await sql`
    INSERT INTO "RefreshToken" (id, token, "userId", "expiresAt")
    VALUES (${crypto.randomUUID()}, ${newRefreshToken}, ${tokenRecord.userId}, ${expiresAt})
  `;

  return c.json({ accessToken, refreshToken: newRefreshToken });
});

app.use('/api/users/*', async (c, next) => {
  if (!c.get('userId')) return jsonError(401, 'Invalid or expired token');
  await next();
});

app.use('/api/servers/*', async (c, next) => {
  if (!c.get('userId')) return jsonError(401, 'Invalid or expired token');
  await next();
});

app.use('/api/channels/*', async (c, next) => {
  if (!c.get('userId')) return jsonError(401, 'Invalid or expired token');
  await next();
});

app.use('/api/messages/*', async (c, next) => {
  if (!c.get('userId')) return jsonError(401, 'Invalid or expired token');
  await next();
});

app.use('/api/dms/*', async (c, next) => {
  if (!c.get('userId')) return jsonError(401, 'Invalid or expired token');
  await next();
});

app.use('/api/files/*', async (_c, next) => {
  await next();
});

app.get('/api/users/me', async (c) => {
  const sql = getSql(c.env);
  const users = await sql`
    SELECT id, username, email, avatar, "statusMessage", status, "createdAt"
    FROM "User"
    WHERE id = ${c.get('userId')}
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return jsonError(404, 'User not found');
  return c.json(user);
});

app.put('/api/users/me', async (c) => {
  const parsed = updateProfileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const sql = getSql(c.env);
  const fields: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.username !== undefined) {
    fields.push(`username = $${fields.length + 1}`);
    values.push(parsed.data.username);
  }
  if (parsed.data.statusMessage !== undefined) {
    fields.push(`"statusMessage" = $${fields.length + 1}`);
    values.push(parsed.data.statusMessage ?? null);
  }
  if (parsed.data.avatar !== undefined) {
    fields.push(`avatar = $${fields.length + 1}`);
    values.push(parsed.data.avatar ?? null);
  }

  if (fields.length === 0) {
    return jsonError(400, 'No profile fields provided');
  }

  const query = `
    UPDATE "User"
    SET ${fields.join(', ')}, "updatedAt" = NOW()
    WHERE id = $${fields.length + 1}
    RETURNING id, username, email, avatar, "statusMessage", status
  `;
  const result = await sql.query(query, [...values, c.get('userId')]);
  return c.json(result[0]);
});

app.get('/api/users', async (c) => {
  const q = c.req.query('q')?.trim();
  const sql = getSql(c.env);
  const users = q
    ? await sql`
        SELECT id, username, avatar, status, "statusMessage"
        FROM "User"
        WHERE id <> ${c.get('userId')} AND username ILIKE ${`%${q}%`}
        ORDER BY username ASC
        LIMIT 50
      `
    : await sql`
        SELECT id, username, avatar, status, "statusMessage"
        FROM "User"
        WHERE id <> ${c.get('userId')}
        ORDER BY username ASC
        LIMIT 50
      `;
  return c.json(users);
});

app.get('/api/users/:id', async (c) => {
  const sql = getSql(c.env);
  const users = await sql`
    SELECT id, username, avatar, "statusMessage", status, "createdAt"
    FROM "User"
    WHERE id = ${c.req.param('id')}
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return jsonError(404, 'User not found');
  return c.json(user);
});

app.get('/api/servers', async (c) => {
  const sql = getSql(c.env);
  const servers = await sql`
    SELECT s.id, s.name, s.description, s.icon, s."ownerId", s."inviteCode", s."createdAt"
    FROM "ServerMember" sm
    JOIN "Server" s ON s.id = sm."serverId"
    WHERE sm."userId" = ${c.get('userId')}
    ORDER BY s.name ASC
  `;
  return c.json(servers);
});

app.post('/api/servers', async (c) => {
  const parsed = createServerSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const sql = getSql(c.env);
  const serverId = crypto.randomUUID();
  const inviteCode = crypto.randomUUID();

  const servers = await sql`
    INSERT INTO "Server" (id, name, description, "ownerId", "inviteCode")
    VALUES (${serverId}, ${parsed.data.name}, ${parsed.data.description ?? null}, ${c.get('userId')}, ${inviteCode})
    RETURNING id, name, description, icon, "ownerId", "inviteCode", "createdAt"
  `;

  await sql`
    INSERT INTO "ServerMember" (id, "serverId", "userId", role)
    VALUES (${crypto.randomUUID()}, ${serverId}, ${c.get('userId')}, ${'OWNER'}::"ServerRole")
  `;

  await sql`
    INSERT INTO "Channel" (id, name, type, "serverId", "minRole")
    VALUES (${crypto.randomUUID()}, ${'general'}, ${'TEXT'}::"ChannelType", ${serverId}, ${'MEMBER'}::"ServerRole")
  `;

  return c.json(servers[0], 201);
});

app.get('/api/servers/:id/channels', async (c) => {
  const sql = getSql(c.env);
  const memberships = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const member = memberships[0] as { role: ServerRole } | undefined;
  const userRank = member ? ROLE_RANK[member.role] : 0;

  const channels = await sql`
    SELECT id, name, type, "serverId", "minRole", "createdAt"
    FROM "Channel"
    WHERE "serverId" = ${c.req.param('id')}
    ORDER BY name ASC
  `;

  return c.json(channels.filter((channel) => ROLE_RANK[channel.minRole as ServerRole] <= userRank));
});

app.post('/api/servers/:id/channels', async (c) => {
  const parsed = createChannelSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const sql = getSql(c.env);
  const members = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const member = members[0] as { role: ServerRole } | undefined;
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return jsonError(403, 'Insufficient permissions');

  const channels = await sql`
    INSERT INTO "Channel" (id, name, type, "serverId", "minRole")
    VALUES (${crypto.randomUUID()}, ${parsed.data.name}, ${(parsed.data.type ?? 'TEXT')}::"ChannelType", ${c.req.param('id')}, ${'MEMBER'}::"ServerRole")
    RETURNING id, name, type, "serverId", "minRole", "createdAt"
  `;
  return c.json(channels[0], 201);
});

app.patch('/api/servers/:id/channels/:channelId', async (c) => {
  const parsed = updateChannelSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Invalid minRole value');

  const sql = getSql(c.env);
  const members = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const member = members[0] as { role: ServerRole } | undefined;
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return jsonError(403, 'Insufficient permissions');

  const channels = await sql`
    UPDATE "Channel"
    SET "minRole" = ${parsed.data.minRole}::"ServerRole", "updatedAt" = NOW()
    WHERE id = ${c.req.param('channelId')}
    RETURNING id, name, type, "serverId", "minRole", "createdAt", "updatedAt"
  `;
  return c.json(channels[0]);
});

app.delete('/api/servers/:id/channels/:channelId', async (c) => {
  const sql = getSql(c.env);
  const members = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const member = members[0] as { role: ServerRole } | undefined;
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return jsonError(403, 'Insufficient permissions');

  await sql`DELETE FROM "Channel" WHERE id = ${c.req.param('channelId')}`;
  return c.json({ message: 'Channel deleted' });
});

app.get('/api/servers/:id/members', async (c) => {
  const sql = getSql(c.env);
  const members = await sql`
    SELECT
      sm.id,
      sm."serverId",
      sm."userId",
      sm.role,
      sm."joinedAt",
      u.id AS "user.id",
      u.username AS "user.username",
      u.avatar AS "user.avatar",
      u.status AS "user.status",
      u."statusMessage" AS "user.statusMessage"
    FROM "ServerMember" sm
    JOIN "User" u ON u.id = sm."userId"
    WHERE sm."serverId" = ${c.req.param('id')}
    ORDER BY u.username ASC
  `;

  return c.json(members.map((member) => ({
    id: member.id,
    serverId: member.serverId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    user: {
      id: member['user.id'],
      username: member['user.username'],
      avatar: member['user.avatar'],
      status: member['user.status'],
      statusMessage: member['user.statusMessage'],
    },
  })));
});

app.post('/api/servers/:id/members', async (c) => {
  const body = await c.req.json().catch(() => null) as { userId?: string } | null;
  if (!body?.userId) return jsonError(400, 'userId required');

  const sql = getSql(c.env);
  const callers = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const caller = callers[0] as { role: ServerRole } | undefined;
  if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) return jsonError(403, 'Insufficient permissions');

  const existing = await sql`
    SELECT id
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${body.userId}
    LIMIT 1
  `;
  if (existing.length > 0) return jsonError(400, 'Already a member');

  await sql`
    INSERT INTO "ServerMember" (id, "serverId", "userId", role)
    VALUES (${crypto.randomUUID()}, ${c.req.param('id')}, ${body.userId}, ${'MEMBER'}::"ServerRole")
  `;

  const created = await sql`
    SELECT
      sm.id,
      sm."serverId",
      sm."userId",
      sm.role,
      sm."joinedAt",
      u.id AS "user.id",
      u.username AS "user.username",
      u.avatar AS "user.avatar",
      u.status AS "user.status",
      u."statusMessage" AS "user.statusMessage"
    FROM "ServerMember" sm
    JOIN "User" u ON u.id = sm."userId"
    WHERE sm."serverId" = ${c.req.param('id')} AND sm."userId" = ${body.userId}
    LIMIT 1
  `;

  const member = created[0];
  return c.json({
    id: member.id,
    serverId: member.serverId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    user: {
      id: member['user.id'],
      username: member['user.username'],
      avatar: member['user.avatar'],
      status: member['user.status'],
      statusMessage: member['user.statusMessage'],
    },
  }, 201);
});

app.patch('/api/servers/:id/members/:userId', async (c) => {
  const parsed = updateMemberRoleSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'role must be ADMIN or MEMBER');

  const sql = getSql(c.env);
  const callers = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const caller = callers[0] as { role: ServerRole } | undefined;
  if (!caller || caller.role !== 'OWNER') return jsonError(403, 'Only the server owner can change roles');

  const targets = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.req.param('userId')}
    LIMIT 1
  `;
  const target = targets[0] as { role: ServerRole } | undefined;
  if (!target || target.role === 'OWNER') return jsonError(400, 'Cannot change owner role');

  await sql`
    UPDATE "ServerMember"
    SET role = ${parsed.data.role}::"ServerRole"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.req.param('userId')}
  `;

  return c.json({ message: 'Member updated' });
});

app.delete('/api/servers/:id/members/:userId', async (c) => {
  const sql = getSql(c.env);
  const callers = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')}
    LIMIT 1
  `;
  const caller = callers[0] as { role: ServerRole } | undefined;
  if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) return jsonError(403, 'Insufficient permissions');

  const targets = await sql`
    SELECT role
    FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.req.param('userId')}
    LIMIT 1
  `;
  const target = targets[0] as { role: ServerRole } | undefined;
  if (!target || target.role === 'OWNER') return jsonError(400, 'Cannot remove the server owner');
  if (caller.role === 'ADMIN' && target.role === 'ADMIN') return jsonError(403, 'Admins cannot remove other admins');

  await sql`
    DELETE FROM "ServerMember"
    WHERE "serverId" = ${c.req.param('id')} AND "userId" = ${c.req.param('userId')}
  `;
  return c.json({ message: 'Member removed' });
});

app.get('/api/channels/:id/messages', async (c) => {
  const sql = getSql(c.env);
  const before = c.req.query('before');
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '50', 10) || 50, 100);

  const messages = before
    ? await sql`
        SELECT
          m.id,
          m.content,
          m."authorId",
          m."channelId",
          m."editedAt",
          m."createdAt",
          u.id AS "author.id",
          u.username AS "author.username",
          u.avatar AS "author.avatar"
        FROM "Message" m
        JOIN "User" u ON u.id = m."authorId"
        WHERE m."channelId" = ${c.req.param('id')} AND m."createdAt" < ${before}
        ORDER BY m."createdAt" DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          m.id,
          m.content,
          m."authorId",
          m."channelId",
          m."editedAt",
          m."createdAt",
          u.id AS "author.id",
          u.username AS "author.username",
          u.avatar AS "author.avatar"
        FROM "Message" m
        JOIN "User" u ON u.id = m."authorId"
        WHERE m."channelId" = ${c.req.param('id')}
        ORDER BY m."createdAt" DESC
        LIMIT ${limit}
      `;

  const orderedMessages = [...messages].reverse();
  const messageIds = orderedMessages.map((message) => message.id);
  const reactions = messageIds.length === 0 ? [] : await sql`
    SELECT r.id, r.emoji, r."messageId", r."userId", u.id AS "user.id", u.username AS "user.username"
    FROM "Reaction" r
    JOIN "User" u ON u.id = r."userId"
    WHERE r."messageId" = ANY(${messageIds})
  `;
  const files = messageIds.length === 0 ? [] : await sql`
    SELECT id, filename, "originalName", "mimeType", size, url, "messageId"
    FROM "File"
    WHERE "messageId" = ANY(${messageIds})
  `;

  return c.json(orderedMessages.map((message) => ({
    id: message.id,
    content: message.content,
    authorId: message.authorId,
    channelId: message.channelId,
    editedAt: message.editedAt,
    createdAt: message.createdAt,
    author: {
      id: message['author.id'],
      username: message['author.username'],
      avatar: message['author.avatar'],
    },
    reactions: reactions
      .filter((reaction) => reaction.messageId === message.id)
      .map((reaction) => ({
        id: reaction.id,
        emoji: reaction.emoji,
        messageId: reaction.messageId,
        userId: reaction.userId,
        user: { id: reaction['user.id'], username: reaction['user.username'] },
      })),
    files: files
      .filter((file) => file.messageId === message.id)
      .map(({ messageId: _messageId, ...file }) => file),
  })));
});

app.post('/api/channels/:channelId/messages', async (c) => {
  const parsed = messageContentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Message content required (1-4000 characters)');

  const sql = getSql(c.env);
  const created = await sql`
    INSERT INTO "Message" (id, content, "authorId", "channelId")
    VALUES (${crypto.randomUUID()}, ${parsed.data.content}, ${c.get('userId')}, ${c.req.param('channelId')})
    RETURNING id, content, "authorId", "channelId", "editedAt", "createdAt"
  `;
  const message = created[0];
  const authors = await sql`
    SELECT id, username, avatar
    FROM "User"
    WHERE id = ${message.authorId}
    LIMIT 1
  `;

  return c.json({
    ...message,
    author: authors[0],
    reactions: [],
    files: [],
  }, 201);
});

app.put('/api/messages/:id', async (c) => {
  const parsed = messageContentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Message content required (1-4000 characters)');

  const sql = getSql(c.env);
  const messages = await sql`
    SELECT "authorId"
    FROM "Message"
    WHERE id = ${c.req.param('id')}
    LIMIT 1
  `;
  const message = messages[0] as { authorId: string } | undefined;
  if (!message) return jsonError(404, 'Message not found');
  if (message.authorId !== c.get('userId')) return jsonError(403, 'Forbidden');

  const updated = await sql`
    UPDATE "Message"
    SET content = ${parsed.data.content}, "editedAt" = NOW()
    WHERE id = ${c.req.param('id')}
    RETURNING id, content, "authorId", "channelId", "editedAt", "createdAt"
  `;
  const authors = await sql`
    SELECT id, username, avatar
    FROM "User"
    WHERE id = ${updated[0].authorId}
    LIMIT 1
  `;
  return c.json({ ...updated[0], author: authors[0], reactions: [], files: [] });
});

app.delete('/api/messages/:id', async (c) => {
  const sql = getSql(c.env);
  const messages = await sql`
    SELECT "authorId"
    FROM "Message"
    WHERE id = ${c.req.param('id')}
    LIMIT 1
  `;
  const message = messages[0] as { authorId: string } | undefined;
  if (!message) return jsonError(404, 'Message not found');
  if (message.authorId !== c.get('userId')) return jsonError(403, 'Forbidden');

  await sql`DELETE FROM "Message" WHERE id = ${c.req.param('id')}`;
  return c.json({ message: 'Message deleted' });
});

app.post('/api/messages/:id/reactions', async (c) => {
  const parsed = reactionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Valid emoji required');

  const sql = getSql(c.env);
  const existing = await sql`
    SELECT id
    FROM "Reaction"
    WHERE "messageId" = ${c.req.param('id')} AND "userId" = ${c.get('userId')} AND emoji = ${parsed.data.emoji}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM "Reaction" WHERE id = ${existing[0].id}`;
    return c.json({ removed: true });
  }

  const created = await sql`
    INSERT INTO "Reaction" (id, emoji, "messageId", "userId")
    VALUES (${crypto.randomUUID()}, ${parsed.data.emoji}, ${c.req.param('id')}, ${c.get('userId')})
    RETURNING id, emoji, "messageId", "userId"
  `;

  return c.json(created[0], 201);
});

app.get('/api/dms', async (c) => {
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT
      dm.id,
      dm.content,
      dm."senderId",
      dm."receiverId",
      dm."editedAt",
      dm."createdAt",
      sender.id AS "sender.id",
      sender.username AS "sender.username",
      sender.avatar AS "sender.avatar",
      receiver.id AS "receiver.id",
      receiver.username AS "receiver.username",
      receiver.avatar AS "receiver.avatar",
      receiver.status AS "receiver.status",
      sender.status AS "sender.status"
    FROM "DirectMessage" dm
    JOIN "User" sender ON sender.id = dm."senderId"
    JOIN "User" receiver ON receiver.id = dm."receiverId"
    WHERE dm."senderId" = ${c.get('userId')} OR dm."receiverId" = ${c.get('userId')}
    ORDER BY dm."createdAt" DESC
  `;

  const conversations = new Map<string, unknown>();
  for (const dm of rows) {
    const partnerId = dm.senderId === c.get('userId') ? dm.receiverId : dm.senderId;
    if (conversations.has(partnerId)) continue;
    const partner = dm.senderId === c.get('userId')
      ? { id: dm['receiver.id'], username: dm['receiver.username'], avatar: dm['receiver.avatar'], status: dm['receiver.status'] }
      : { id: dm['sender.id'], username: dm['sender.username'], avatar: dm['sender.avatar'], status: dm['sender.status'] };
    conversations.set(partnerId, {
      user: partner,
      lastMessage: {
        id: dm.id,
        content: dm.content,
        senderId: dm.senderId,
        receiverId: dm.receiverId,
        editedAt: dm.editedAt,
        createdAt: dm.createdAt,
        sender: { id: dm['sender.id'], username: dm['sender.username'], avatar: dm['sender.avatar'] },
      },
    });
  }

  return c.json(Array.from(conversations.values()));
});

app.get('/api/dms/:userId', async (c) => {
  const sql = getSql(c.env);
  const before = c.req.query('before');
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '50', 10) || 50, 100);

  const messages = before
    ? await sql`
        SELECT dm.id, dm.content, dm."senderId", dm."receiverId", dm."editedAt", dm."createdAt",
          sender.id AS "sender.id", sender.username AS "sender.username", sender.avatar AS "sender.avatar"
        FROM "DirectMessage" dm
        JOIN "User" sender ON sender.id = dm."senderId"
        WHERE ((dm."senderId" = ${c.get('userId')} AND dm."receiverId" = ${c.req.param('userId')})
          OR (dm."senderId" = ${c.req.param('userId')} AND dm."receiverId" = ${c.get('userId')}))
          AND dm."createdAt" < ${before}
        ORDER BY dm."createdAt" DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT dm.id, dm.content, dm."senderId", dm."receiverId", dm."editedAt", dm."createdAt",
          sender.id AS "sender.id", sender.username AS "sender.username", sender.avatar AS "sender.avatar"
        FROM "DirectMessage" dm
        JOIN "User" sender ON sender.id = dm."senderId"
        WHERE (dm."senderId" = ${c.get('userId')} AND dm."receiverId" = ${c.req.param('userId')})
          OR (dm."senderId" = ${c.req.param('userId')} AND dm."receiverId" = ${c.get('userId')})
        ORDER BY dm."createdAt" DESC
        LIMIT ${limit}
      `;

  return c.json(messages.reverse().map((dm) => ({
    id: dm.id,
    content: dm.content,
    senderId: dm.senderId,
    receiverId: dm.receiverId,
    editedAt: dm.editedAt,
    createdAt: dm.createdAt,
    sender: { id: dm['sender.id'], username: dm['sender.username'], avatar: dm['sender.avatar'] },
  })));
});

app.post('/api/dms/:userId', async (c) => {
  const parsed = dmSendSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'Content required (1-4000 characters)');

  const sql = getSql(c.env);
  const created = await sql`
    INSERT INTO "DirectMessage" (id, content, "senderId", "receiverId")
    VALUES (${crypto.randomUUID()}, ${parsed.data.content}, ${c.get('userId')}, ${c.req.param('userId')})
    RETURNING id, content, "senderId", "receiverId", "editedAt", "createdAt"
  `;
  const senders = await sql`
    SELECT id, username, avatar
    FROM "User"
    WHERE id = ${c.get('userId')}
    LIMIT 1
  `;

  return c.json({
    ...created[0],
    sender: senders[0],
  }, 201);
});

app.post('/api/files/upload', () => jsonError(501, 'File uploads are disabled in the Cloudflare Worker deployment. Use object storage before enabling uploads.'));
app.get('/api/files/:filename', () => jsonError(404, 'File not found'));

export default app;