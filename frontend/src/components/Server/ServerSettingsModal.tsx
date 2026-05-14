import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { Channel, ServerMember } from '../../types';

interface Props {
  serverId: string;
  serverName: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onClose: () => void;
  onChannelsChanged: () => void;
  onMembersChanged: () => void;
}

type Tab = 'members' | 'channels' | 'permissions';

const ROLE_LABELS: Record<string, string> = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member' };
const MIN_ROLE_OPTIONS: Array<{ value: 'MEMBER' | 'ADMIN' | 'OWNER'; label: string }> = [
  { value: 'MEMBER', label: 'Everyone' },
  { value: 'ADMIN', label: 'Admin+' },
  { value: 'OWNER', label: 'Owner only' },
];

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-indigo-700', 'bg-blue-700',
  'bg-teal-700', 'bg-emerald-700', 'bg-rose-700',
];
function avatarColor(userId: string) {
  const n = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500', AWAY: 'bg-amber-400', DND: 'bg-red-500', OFFLINE: 'bg-zinc-600',
};

// ─── Tab: Members ──────────────────────────────────────────────────────────────

function MembersTab({ serverId, currentUserRole, onChanged }: {
  serverId: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const loadMembers = () => {
    apiClient.get(`/servers/${serverId}/members`).then(r => setMembers(r.data)).catch(() => {});
  };
  useEffect(loadMembers, [serverId]);

  // Search non-members
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchLoading(true);
      apiClient.get(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`)
        .then(r => {
          const memberIds = new Set(members.map(m => m.user.id));
          setSearchResults(r.data.filter((u: any) => !memberIds.has(u.id)));
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, members]);

  const addMember = async (userId: string) => {
    setAdding(userId);
    try {
      await apiClient.post(`/servers/${serverId}/members`, { userId });
      loadMembers();
      onChanged();
    } catch {}
    setAdding(null);
  };

  const removeMember = async (userId: string) => {
    try {
      await apiClient.delete(`/servers/${serverId}/members/${userId}`);
      loadMembers();
      onChanged();
    } catch {}
  };

  const changeRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      await apiClient.patch(`/servers/${serverId}/members/${userId}`, { role });
      loadMembers();
      onChanged();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add members search */}
      {canManage && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Add Members</h3>
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 mb-3 focus-within:border-zinc-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search users to add…"
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {searchLoading && <p className="text-zinc-500 text-sm py-2 text-center">Searching…</p>}
            {!searchLoading && searchResults.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/50">
                <div className="relative shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(u.id)}`}>
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${statusDot[u.status] || 'bg-zinc-600'}`} />
                </div>
                <span className="text-zinc-200 text-sm flex-1">{u.username}</span>
                <button
                  type="button"
                  onClick={() => addMember(u.id)}
                  disabled={adding === u.id}
                  className="text-xs px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {adding === u.id ? '…' : 'Add'}
                </button>
              </div>
            ))}
            {!searchLoading && !query && searchResults.length === 0 && (
              <p className="text-zinc-600 text-xs text-center py-2">All users are already members.</p>
            )}
          </div>
        </div>
      )}

      {/* Current members */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Members — {members.length}
        </h3>
        <div className="flex flex-col gap-1">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/30">
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden ${avatarColor(m.user.id)}`}>
                  {m.user.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" /> : m.user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${statusDot[m.user.status] || 'bg-zinc-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-sm font-medium truncate">{m.user.username}</p>
                <p className="text-zinc-500 text-xs">{ROLE_LABELS[m.role]}</p>
              </div>
              {/* Role change — owner only, can't change other owners */}
              {currentUserRole === 'OWNER' && m.role !== 'OWNER' && (
                <select
                  value={m.role}
                  onChange={e => changeRole(m.user.id, e.target.value as 'ADMIN' | 'MEMBER')}
                  className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1 outline-none focus:border-violet-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}
              {/* Remove — owner/admin, can't remove owner or other admins (if admin) */}
              {canManage && m.role !== 'OWNER' && !(currentUserRole === 'ADMIN' && m.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => removeMember(m.user.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                  title="Remove member"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Channels ─────────────────────────────────────────────────────────────

function ChannelsTab({ serverId, currentUserRole, onChanged }: {
  serverId: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onChanged: () => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [creating, setCreating] = useState(false);
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const loadChannels = () => {
    apiClient.get(`/servers/${serverId}/channels`).then(r => setChannels(r.data)).catch(() => {});
  };
  useEffect(loadChannels, [serverId]);

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiClient.post(`/servers/${serverId}/channels`, { name: name.trim(), type });
      setName('');
      loadChannels();
      onChanged();
    } catch {}
    setCreating(false);
  };

  const deleteChannel = async (channelId: string) => {
    try {
      await apiClient.delete(`/servers/${serverId}/channels/${channelId}`);
      loadChannels();
      onChanged();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Create Channel</h3>
          <form onSubmit={createChannel} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="channel-name"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-violet-500 transition-colors"
            />
            <div className="flex gap-2">
              {(['TEXT', 'VOICE'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    type === t
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t === 'TEXT' ? '# Text' : '🔊 Voice'}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create Channel'}
            </button>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Channels — {channels.length}
        </h3>
        <div className="flex flex-col gap-1">
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-zinc-800/30">
              <span className="text-zinc-500 text-sm w-5 text-center shrink-0">
                {ch.type === 'VOICE' ? '🔊' : '#'}
              </span>
              <span className="text-zinc-200 text-sm flex-1">{ch.name}</span>
              {ch.minRole && ch.minRole !== 'MEMBER' && (
                <span className="text-xs text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded-full">
                  {ch.minRole === 'ADMIN' ? 'Admin+' : 'Owner only'}
                </span>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={() => deleteChannel(ch.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                  title="Delete channel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Permissions ──────────────────────────────────────────────────────────

function PermissionsTab({ serverId, currentUserRole, onChanged }: {
  serverId: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onChanged: () => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);

  // Fetch ALL channels (not filtered by role) for permissions view
  // We reuse the server channels endpoint — admins/owners see all
  useEffect(() => {
    // Load all channels including restricted ones by calling with elevated context
    apiClient.get(`/servers/${serverId}/channels`).then(r => setChannels(r.data)).catch(() => {});
  }, [serverId]);

  const updateMinRole = async (channelId: string, minRole: 'MEMBER' | 'ADMIN' | 'OWNER') => {
    try {
      await apiClient.patch(`/servers/${serverId}/channels/${channelId}`, { minRole });
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, minRole } : c));
      onChanged();
    } catch {}
  };

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div>
      <p className="text-zinc-500 text-sm mb-4">
        Control which role is required to see each channel.
      </p>
      <div className="flex flex-col gap-2">
        {channels.map(ch => (
          <div key={ch.id} className="flex items-center gap-3 px-3 py-3 bg-zinc-800/40 rounded-xl">
            <span className="text-zinc-500 text-sm w-5 text-center shrink-0">
              {ch.type === 'VOICE' ? '🔊' : '#'}
            </span>
            <span className="text-zinc-200 text-sm flex-1 font-medium">{ch.name}</span>
            {canManage ? (
              <select
                value={ch.minRole || 'MEMBER'}
                onChange={e => updateMinRole(ch.id, e.target.value as 'MEMBER' | 'ADMIN' | 'OWNER')}
                className="text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500"
              >
                {MIN_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-zinc-400">
                {MIN_ROLE_OPTIONS.find(o => o.value === (ch.minRole || 'MEMBER'))?.label}
              </span>
            )}
          </div>
        ))}
        {channels.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-4">No channels yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function ServerSettingsModal({ serverId, serverName, currentUserRole, onClose, onChannelsChanged, onMembersChanged }: Props) {
  const [tab, setTab] = useState<Tab>('members');

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'members', label: 'Members' },
    { key: 'channels', label: 'Channels' },
    { key: 'permissions', label: 'Permissions' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-zinc-100 font-semibold text-base">{serverName}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Server Settings</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-zinc-800 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'text-violet-400 border-violet-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'members' && (
            <MembersTab serverId={serverId} currentUserRole={currentUserRole} onChanged={onMembersChanged} />
          )}
          {tab === 'channels' && (
            <ChannelsTab serverId={serverId} currentUserRole={currentUserRole} onChanged={onChannelsChanged} />
          )}
          {tab === 'permissions' && (
            <PermissionsTab serverId={serverId} currentUserRole={currentUserRole} onChanged={onChannelsChanged} />
          )}
        </div>
      </div>
    </div>
  );
}
