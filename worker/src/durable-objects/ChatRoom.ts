import { DurableObject } from 'cloudflare:workers';

interface Env {
  DB: D1Database;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  attachmentUrl: string | null;
  createdAt: number;
}

export class ChatRoom extends DurableObject<Env> {
  private sessions = new Map<WebSocket, { userId: string; username: string }>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('channelId')!;
    const userId = url.searchParams.get('userId')!;
    const username = url.searchParams.get('username')!;

    if (request.headers.get('Upgrade') !== 'websocket')
      return new Response('Expected WebSocket', { status: 426 });

    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, { userId, username });

    this.broadcast(JSON.stringify({ type: 'presence', userId, username, online: true }), server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const session = this.sessions.get(ws);
    if (!session) return;

    let msg: { type: string; content?: string; attachmentUrl?: string; channelId?: string };
    try { msg = JSON.parse(raw as string); } catch { return; }

    if (msg.type === 'message' && msg.content && msg.channelId) {
      const id = crypto.randomUUID();
      const createdAt = Math.floor(Date.now() / 1000);

      await this.env.DB.prepare(
        'INSERT INTO messages (id, channel_id, user_id, content, attachment_url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, msg.channelId, session.userId, msg.content, msg.attachmentUrl ?? null, createdAt).run();

      const outbound: ChatMessage = {
        id,
        userId: session.userId,
        username: session.username,
        avatarUrl: null,
        content: msg.content,
        attachmentUrl: msg.attachmentUrl ?? null,
        createdAt,
      };
      this.broadcast(JSON.stringify({ type: 'message', ...outbound }));
    }

    if (msg.type === 'typing') {
      this.broadcast(
        JSON.stringify({ type: 'typing', userId: session.userId, username: session.username }),
        ws
      );
    }
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.sessions.get(ws);
    if (session) {
      this.broadcast(JSON.stringify({ type: 'presence', userId: session.userId, username: session.username, online: false }));
      this.sessions.delete(ws);
    }
  }

  private broadcast(msg: string, exclude?: WebSocket) {
    for (const [ws] of this.sessions) {
      if (ws !== exclude) ws.send(msg);
    }
  }
}
