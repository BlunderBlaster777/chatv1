'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MessageInput from './MessageInput';
import MemberList from './MemberList';

const API = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = API?.replace(/^http/, 'ws');
const PAGE_SIZE = 50;

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: number;
}

interface Member { userId: string; username: string; online: boolean }

export default function ChatArea({
  channelId,
  channelName,
  channelType,
}: {
  channelId: string;
  channelName: string;
  channelType?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounting = useRef(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const currentUser = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? 'null')
    : null;

  // --- WebSocket with auto-reconnect ---
  const connect = useCallback(() => {
    if (!token || isUnmounting.current) return;

    const ws = new WebSocket(`${WS_URL}/ws/${channelId}`, ['bearer', token]);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
        // Auto-scroll only if user is near the bottom
        const el = scrollRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      }

      if (data.type === 'presence') {
        setMembers(prev => {
          const exists = prev.find(m => m.userId === data.userId);
          if (exists) return prev.map(m => m.userId === data.userId ? { ...m, online: data.online } : m);
          return [...prev, { userId: data.userId, username: data.username, online: data.online }];
        });
      }

      if (data.type === 'typing') {
        setTyping(prev => prev.includes(data.username) ? prev : [...prev, data.username]);
        const t = typingTimers.current.get(data.username);
        if (t) clearTimeout(t);
        typingTimers.current.set(data.username, setTimeout(() => {
          setTyping(prev => prev.filter(u => u !== data.username));
        }, 3000));
      }
    };

    ws.onclose = () => {
      if (isUnmounting.current) return;
      // Exponential backoff: 1s, 2s, 4s, 8s, … capped at 30s
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
      reconnectAttempts.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [channelId, token]);

  // --- Initial load ---
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    isUnmounting.current = false;
    setMessages([]);
    setMembers([]);
    setHasMore(true);

    fetch(`${API}/api/messages/${channelId}?limit=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((msgs: Message[]) => {
        setMessages(msgs);
        setHasMore(msgs.length === PAGE_SIZE);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      });

    connect();

    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }, 25_000);

    return () => {
      isUnmounting.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearInterval(heartbeat);
      wsRef.current?.close();
    };
  }, [channelId, token, connect]);

  // --- Infinite scroll: fetch older messages when user scrolls to top ---
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0].createdAt;
    setLoadingMore(true);

    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    const res = await fetch(
      `${API}/api/messages/${channelId}?before=${oldest}&limit=${PAGE_SIZE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const older: Message[] = await res.json();
    setLoadingMore(false);
    if (older.length === 0) { setHasMore(false); return; }

    setMessages(prev => [...older, ...prev]);
    setHasMore(older.length === PAGE_SIZE);

    // Restore scroll position so the view doesn't jump
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
    });
  }, [channelId, token, messages, loadingMore, hasMore]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80) loadMore();
  }

  const sendMessage = useCallback((content: string, attachmentUrl?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', channelId, content, attachmentUrl }));
    }
  }, [channelId]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const visibleTyping = typing.filter(u => u !== currentUser?.username);

  const headerPrefix = channelType === 'dm' ? '@' : channelType === 'group' ? '' : '#';

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/30 shadow-sm shrink-0">
          <span className="text-discord-muted font-bold">{headerPrefix}</span>
          <span className="text-white font-semibold">{channelName}</span>
          {channelType === 'group' && (
            <span className="text-discord-muted text-xs ml-1">· group</span>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-2"
        >
          {loadingMore && (
            <p className="text-discord-muted text-xs text-center py-2 animate-pulse">
              Loading older messages…
            </p>
          )}
          {!hasMore && messages.length > 0 && (
            <p className="text-discord-muted text-xs text-center py-3 border-b border-discord-hover mb-3">
              Beginning of #{channelName}
            </p>
          )}

          <div className="space-y-1">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const grouped = prev?.userId === msg.userId && (msg.createdAt - prev.createdAt) < 300;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 hover:bg-white/5 rounded px-1 py-0.5 ${grouped ? 'ml-10' : 'mt-3'}`}
                >
                  {!grouped && (
                    <div className="w-9 h-9 rounded-full bg-discord-accent flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5">
                      {msg.username[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-white font-medium text-sm">{msg.username}</span>
                        <span className="text-discord-muted text-xs">
                          {new Date(msg.createdAt * 1000).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                    {msg.content && <p className="text-discord-text text-sm">{msg.content}</p>}
                    {msg.attachmentUrl && (
                      <img
                        src={`${API}${msg.attachmentUrl}`}
                        alt="attachment"
                        className="max-w-xs max-h-64 rounded mt-1 object-contain"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {visibleTyping.length > 0 && (
            <p className="text-discord-muted text-xs italic px-2 mt-1">
              {visibleTyping.join(', ')} {visibleTyping.length === 1 ? 'is' : 'are'} typing…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <MessageInput channelName={channelName} onSend={sendMessage} onTyping={sendTyping} />
      </div>

      <MemberList members={members} />
    </div>
  );
}
