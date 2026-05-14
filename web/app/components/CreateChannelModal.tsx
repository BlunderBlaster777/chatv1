'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Channel { id: string; name: string; description: string }

export default function CreateChannelModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (ch: Channel) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.toLowerCase().replace(/\s+/g, '-'), description: desc }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    onCreate(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form onSubmit={submit} className="bg-discord-sidebar rounded-xl p-6 w-80 space-y-4">
        <h2 className="text-white font-bold text-lg">Create Channel</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-discord-accent"
          placeholder="channel-name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-discord-accent"
          placeholder="Description (optional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-discord-muted hover:text-white text-sm rounded-md">
            Cancel
          </button>
          <button type="submit"
            className="px-4 py-2 bg-discord-accent hover:bg-indigo-500 text-white text-sm rounded-md">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
