import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiClient from '../api/client';
import { DirectMessage } from '../types';
import DMSidebar from '../components/DM/DMSidebar';
import ServerSidebar from '../components/Layout/ServerSidebar';
import { runtimeConfig } from '../config/runtime';

interface DMConversation {
  user: { id: string; username: string; avatar?: string | null; status: string };
  lastMessage: DirectMessage;
}

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-indigo-700', 'bg-blue-700',
  'bg-teal-700', 'bg-emerald-700', 'bg-rose-700',
];
function avatarColor(userId: string) {
  const n = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today at ${formatTime(dateStr)}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + formatTime(dateStr);
}

export default function DMPage() {
  const { userId: partnerId } = useParams<{ userId: string }>();
  const { user, logout } = useAuth();
  const { socket, realtimeEnabled } = useSocket();
  const navigate = useNavigate();

  const [leftOpen, setLeftOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [partner, setPartner] = useState<{ id: string; username: string; avatar?: string | null; status: string } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [servers, setServers] = useState<{ id: string; name: string; icon?: string | null }[]>([]);
  const [content, setContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    const { data } = await apiClient.get('/dms');
    setConversations(data);
  }, []);

  const loadPartnerMessages = useCallback(async (userId: string) => {
    const { data } = await apiClient.get(`/dms/${userId}`);
    setMessages(data);
  }, []);

  useEffect(() => {
    if (!partnerId) return;
    apiClient.get(`/users/${partnerId}`).then(r => setPartner(r.data)).catch(() => {});
    loadPartnerMessages(partnerId).catch(() => {});
  }, [partnerId, loadPartnerMessages]);

  useEffect(() => {
    loadConversations().catch(() => {});
    apiClient.get('/servers').then(r => setServers(r.data)).catch(() => {});
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !realtimeEnabled) return;
    const handleDM = (dm: DirectMessage) => {
      const isRelevant =
        (dm.senderId === partnerId && dm.receiverId === user?.id) ||
        (dm.senderId === user?.id && dm.receiverId === partnerId);
      if (isRelevant) {
        setMessages(prev => {
          const idx = prev.findIndex(
            m => m.id.startsWith('temp-') && m.senderId === dm.senderId && m.content === dm.content
          );
          if (idx !== -1) { const next = [...prev]; next[idx] = dm; return next; }
          return [...prev, dm];
        });
      }
      loadConversations().catch(() => {});
    };
    const handleTypingStart = ({ userId: uid }: { userId: string }) => {
      if (uid !== partnerId) return;
      setTypingUsers(prev => prev.includes('them') ? prev : [...prev, 'them']);
    };
    const handleTypingStop = ({ userId: uid }: { userId: string }) => {
      if (uid !== partnerId) return;
      setTypingUsers(prev => prev.filter(u => u !== 'them'));
    };
    socket.on('dm:message', handleDM);
    socket.on('dm:typing:start', handleTypingStart);
    socket.on('dm:typing:stop', handleTypingStop);
    return () => {
      socket.off('dm:message', handleDM);
      socket.off('dm:typing:start', handleTypingStart);
      socket.off('dm:typing:stop', handleTypingStop);
    };
  }, [socket, partnerId, user?.id, realtimeEnabled, loadConversations]);

  useEffect(() => {
    if (realtimeEnabled) return;

    loadConversations().catch(() => {});
    if (partnerId) loadPartnerMessages(partnerId).catch(() => {});

    const intervalId = window.setInterval(() => {
      loadConversations().catch(() => {});
      if (partnerId) loadPartnerMessages(partnerId).catch(() => {});
    }, runtimeConfig.pollingIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [partnerId, realtimeEnabled, loadConversations, loadPartnerMessages]);

  const startTyping = useCallback(() => {
    if (!realtimeEnabled) return;
    if (!typingRef.current && partnerId) {
      typingRef.current = true;
      socket?.emit('dm:typing:start', { receiverId: partnerId });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      if (partnerId) socket?.emit('dm:typing:stop', { receiverId: partnerId });
    }, 2000);
  }, [socket, partnerId, realtimeEnabled]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || !partnerId || !user) return;
    setContent('');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingRef.current = false;
    if (realtimeEnabled && socket) {
      const optimistic: DirectMessage = {
        id: `temp-${Date.now()}`,
        content: trimmed,
        senderId: user.id,
        receiverId: partnerId,
        createdAt: new Date().toISOString(),
        editedAt: null,
        sender: { id: user.id, username: user.username, avatar: user.avatar },
      };
      setMessages(prev => [...prev, optimistic]);
      socket.emit('dm:typing:stop', { receiverId: partnerId });
      socket.emit('dm:message', { receiverId: partnerId, content: trimmed });
      return;
    }

    const { data } = await apiClient.post(`/dms/${partnerId}`, { content: trimmed });
    setMessages(prev => [...prev, data]);
    loadConversations().catch(() => {});
  }, [content, partnerId, user, socket, realtimeEnabled, loadConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectConversation = (uid: string) => {
    navigate(`/app/dm/${uid}`);
    setLeftOpen(false);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 relative">

      {/* Backdrop (mobile) */}
      {leftOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setLeftOpen(false)}
        />
      )}

      {/* Left drawer: ServerSidebar + DMSidebar
          Mobile: fixed overlay, slides in from left
          Desktop: normal flex item, always visible */}
      <div className={[
        'fixed inset-y-0 left-0 z-40 flex flex-row',
        'lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0',
        'transition-transform duration-300 ease-in-out',
        leftOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        <ServerSidebar
          servers={servers as any}
          selectedServerId={null}
          onSelectServer={() => navigate('/app')}
          onCreateServer={() => navigate('/app')}
          currentUser={user}
          onOpenDMs={() => setLeftOpen(false)}
          isDMMode
        />
        <DMSidebar
          conversations={conversations}
          currentUserId={user.id}
          selectedUserId={partnerId || null}
          currentUser={user}
          onSelectConversation={handleSelectConversation}
          onOpenSettings={() => setShowSettings(true)}
          onLogout={logout}
          showSettings={showSettings}
          onCloseSettings={() => setShowSettings(false)}
        />
      </div>

      {/* DM Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-900 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/70 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setLeftOpen(true)}
            className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {partner ? (
            <>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0 ${avatarColor(partner.id)}`}>
                {partner.avatar
                  ? <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                  : partner.username.slice(0, 2).toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-zinc-100 font-semibold text-base leading-tight truncate">{partner.username}</h1>
                <p className="text-zinc-500 text-xs capitalize">{partner.status?.toLowerCase()}</p>
              </div>
            </>
          ) : (
            <h1 className="text-zinc-400 font-semibold text-base flex-1">Direct Messages</h1>
          )}
        </header>

        {partner ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 flex flex-col gap-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-500">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 ${avatarColor(partner.id)}`}>
                    {partner.username.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-zinc-200 font-semibold text-lg mb-1">{partner.username}</p>
                  <p className="text-sm">This is the beginning of your conversation.</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMine = msg.senderId === user.id;
                const prev = messages[i - 1];
                const isGrouped = prev && prev.senderId === msg.senderId &&
                  new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                    {!isMine && !isGrouped && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 shrink-0 ${avatarColor(partner.id)}`}>
                        {partner.avatar
                          ? <img src={partner.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                          : partner.username.slice(0, 2).toUpperCase()
                        }
                      </div>
                    )}
                    {!isMine && isGrouped && <div className="w-8 mr-2 shrink-0" />}

                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%] lg:max-w-[70%]`}>
                      {!isGrouped && (
                        <span className={`text-xs text-zinc-500 mb-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                          {isMine ? 'You' : partner.username} · {formatDateTime(msg.createdAt)}
                        </span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-base leading-relaxed break-words ${
                        isMine
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                      } ${msg.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.length > 0 && (
                <div className="flex justify-start mt-2">
                  <div className="bg-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
                    <span className="text-xs text-zinc-400">{partner.username} is typing</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0s]" />
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 lg:px-6 pb-4 lg:pb-5 shrink-0">
              <div className="flex items-end gap-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
                <textarea
                  value={content}
                  onChange={e => { setContent(e.target.value); startTyping(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${partner.username}`}
                  rows={1}
                  aria-label={`Message ${partner.username}`}
                  className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-base resize-none outline-none leading-relaxed max-h-40 overflow-y-auto no-scrollbar"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!content.trim()}
                  title="Send message"
                  className={`p-2 rounded-lg transition-all shrink-0 ${
                    content.trim() ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2 px-6 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 mb-2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p className="text-zinc-300 font-semibold">No conversation open</p>
            <p className="text-zinc-500 text-sm">Tap the menu to pick a conversation or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
