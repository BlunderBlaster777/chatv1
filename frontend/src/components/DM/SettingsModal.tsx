import { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';

interface SearchUser {
  id: string;
  username: string;
  avatar?: string | null;
  status: string;
  statusMessage?: string | null;
}

interface SettingsModalProps {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
  DND: 'bg-red-500',
  OFFLINE: 'bg-zinc-600',
};

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-indigo-700', 'bg-blue-700',
  'bg-teal-700', 'bg-emerald-700', 'bg-rose-700',
];
function avatarColor(userId: string) {
  const n = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function SettingsModal({ onClose, onSelectUser }: SettingsModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      apiClient.get(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`)
        .then(r => setUsers(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-base">Find People</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by username…"
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto max-h-80 py-2">
          {loading && (
            <p className="text-center text-zinc-500 text-sm py-8">Searching…</p>
          )}
          {!loading && users.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-8">
              {query ? 'No users found.' : 'No other users yet.'}
            </p>
          )}
          {!loading && users.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUser(u.id)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors text-left"
            >
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden ${avatarColor(u.id)}`}>
                  {u.avatar
                    ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    : u.username.slice(0, 2).toUpperCase()
                  }
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${statusDot[u.status] || 'bg-zinc-600'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-zinc-100 text-sm font-semibold truncate">{u.username}</p>
                {u.statusMessage && (
                  <p className="text-zinc-500 text-xs truncate">{u.statusMessage}</p>
                )}
              </div>
              <span className="text-xs text-violet-400 font-medium shrink-0">Message</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
