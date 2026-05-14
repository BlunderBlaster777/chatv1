'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CreateChannelModal from './CreateChannelModal';
import StartDMModal from './StartDMModal';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Member { id: string; username: string }
interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  members?: Member[];
}

function dmDisplayName(channel: Channel, myId: string): string {
  if (channel.type !== 'dm') return channel.name;
  const other = channel.members?.find(m => m.id !== myId);
  return other?.username ?? 'Unknown';
}

function groupDisplayName(channel: Channel): string {
  return channel.name || 'Group Chat';
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDM, setShowDM] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? 'null')
    : null;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${API}/api/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setChannels);
  }, []);

  function addChannel(ch: Channel) {
    setChannels(prev => {
      const exists = prev.find(c => c.id === ch.id);
      return exists ? prev : [...prev, ch];
    });
  }

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  function navTo(id: string) {
    onClose?.();
    router.push(`/chat/${id}`);
  }

  const publicChannels = channels.filter(c => c.type === 'public');
  const dmChannels = channels.filter(c => c.type === 'dm' || c.type === 'group');

  return (
    <aside className="flex flex-col h-full bg-discord-sidebar w-60 shrink-0">
      <div className="px-4 py-3 border-b border-black/30 font-bold text-white text-sm shadow">
        Mini-Discord
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Public channels */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-discord-muted text-xs uppercase font-semibold tracking-wide">
              Text Channels
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="text-discord-muted hover:text-white text-lg leading-none"
              title="Create channel"
            >
              +
            </button>
          </div>
          {publicChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => navTo(ch.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm transition text-left ${
                pathname === `/chat/${ch.id}`
                  ? 'bg-discord-hover text-white'
                  : 'text-discord-muted hover:bg-discord-hover hover:text-white'
              }`}
            >
              <span className="text-discord-muted">#</span>
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* DMs + group chats */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-discord-muted text-xs uppercase font-semibold tracking-wide">
              Direct Messages
            </span>
            <button
              onClick={() => setShowDM(true)}
              className="text-discord-muted hover:text-white text-lg leading-none"
              title="New DM or group"
            >
              +
            </button>
          </div>
          {dmChannels.map(ch => {
            const label = ch.type === 'dm'
              ? dmDisplayName(ch, user?.id ?? '')
              : groupDisplayName(ch);
            const isGroup = ch.type === 'group';
            return (
              <button
                key={ch.id}
                onClick={() => navTo(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm transition text-left ${
                  pathname === `/chat/${ch.id}`
                    ? 'bg-discord-hover text-white'
                    : 'text-discord-muted hover:bg-discord-hover hover:text-white'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-discord-input flex items-center justify-center text-xs shrink-0">
                  {isGroup ? '👥' : label[0]?.toUpperCase()}
                </div>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
          {dmChannels.length === 0 && (
            <p className="text-discord-muted text-xs px-2 py-1 italic">
              No DMs yet — click + to start one
            </p>
          )}
        </div>
      </div>

      {/* User bar */}
      <div className="flex items-center gap-2 p-3 bg-discord-servers shrink-0">
        <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="text-discord-text text-sm font-medium flex-1 truncate">
          {user?.username}
        </span>
        <button
          onClick={logout}
          title="Logout"
          className="text-discord-muted hover:text-white text-sm px-1 py-0.5 rounded"
        >
          ⏻
        </button>
      </div>

      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreate={ch => { addChannel(ch); setShowCreate(false); }}
        />
      )}

      {showDM && (
        <StartDMModal
          onClose={() => setShowDM(false)}
          onOpen={ch => { addChannel(ch); setShowDM(false); navTo(ch.id); }}
        />
      )}
    </aside>
  );
}
