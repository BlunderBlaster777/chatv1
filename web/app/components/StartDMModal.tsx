'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

interface User { id: string; username: string }
interface Channel { id: string; name: string; type: string; members?: User[] }

export default function StartDMModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (channel: Channel) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isGroup = selected.size > 1;

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setUsers);
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setError('');
    setLoading(true);
    const token = localStorage.getItem('token');

    const body = isGroup
      ? { type: 'group', name: groupName.trim() || 'Group Chat', memberIds: [...selected] }
      : { type: 'dm', targetUserId: [...selected][0] };

    const res = await fetch(`${API}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    onOpen(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-discord-sidebar rounded-xl p-6 w-96 space-y-4">
        <h2 className="text-white font-bold text-lg">
          {isGroup ? 'New Group Chat' : 'New Direct Message'}
        </h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {isGroup && (
          <input
            className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-discord-accent text-sm"
            placeholder="Group name (optional)"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
        )}

        <p className="text-discord-muted text-xs uppercase font-semibold tracking-wide">
          Select friends — {selected.size} selected
        </p>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                selected.has(u.id)
                  ? 'bg-discord-accent text-white'
                  : 'hover:bg-discord-hover text-discord-text'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-discord-input flex items-center justify-center text-xs font-bold shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              {u.username}
              {selected.has(u.id) && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
          {users.length === 0 && (
            <p className="text-discord-muted text-sm text-center py-4">No other users yet</p>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-discord-muted hover:text-white text-sm rounded-md">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={selected.size === 0 || loading}
            className="px-4 py-2 bg-discord-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-md"
          >
            {loading ? 'Opening…' : isGroup ? 'Create Group' : 'Open DM'}
          </button>
        </div>
      </div>
    </div>
  );
}
