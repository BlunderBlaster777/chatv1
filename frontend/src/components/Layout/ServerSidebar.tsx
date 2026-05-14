import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Server, User } from '../../types';

interface ServerSidebarProps {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onCreateServer: (name: string) => void;
  currentUser: User;
  onOpenDMs: () => void;
  isDMMode?: boolean;
}

export default function ServerSidebar({
  servers, selectedServerId, onSelectServer, onCreateServer, onOpenDMs, isDMMode,
}: ServerSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newServerName.trim()) {
      onCreateServer(newServerName.trim());
      setNewServerName('');
      setShowCreate(false);
    }
  };

  return (
    <>
      <nav className="flex flex-col items-center w-[72px] shrink-0 bg-zinc-950 py-3 gap-1.5 overflow-y-auto border-r border-zinc-800/50">

        {/* DM / Home button */}
        <div className="relative flex items-center justify-center w-full px-1">
          {isDMMode && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-100 rounded-r-full" />}
          <button
            type="button"
            onClick={onOpenDMs}
            title="Direct Messages"
            className={[
              'w-12 h-12 flex items-center justify-center overflow-hidden',
              'transition-all duration-200 cursor-pointer select-none',
              isDMMode
                ? 'rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                : 'rounded-full bg-zinc-800 text-zinc-300 hover:rounded-2xl hover:bg-violet-600 hover:text-white',
            ].join(' ')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>

        <div className="w-8 h-px bg-zinc-800 my-0.5" />

        <div className="w-full flex flex-col items-center gap-1 flex-1">
          {servers.map(server => {
            const isSelected = !isDMMode && server.id === selectedServerId;
            const initials = server.name.slice(0, 2).toUpperCase();
            return (
              <div key={server.id} className="relative flex items-center justify-center w-full px-1">
                {isSelected && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-100 rounded-r-full" />
                )}
                <button
                  type="button"
                  onClick={() => { onSelectServer(server.id); navigate('/app'); }}
                  title={server.name}
                  className={[
                    'w-12 h-12 flex items-center justify-center text-sm font-bold overflow-hidden',
                    'transition-all duration-200 cursor-pointer select-none',
                    isSelected
                      ? 'rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                      : 'rounded-full bg-zinc-800 text-zinc-300 hover:rounded-2xl hover:bg-violet-600 hover:text-white',
                  ].join(' ')}
                >
                  {server.icon
                    ? <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                    : initials
                  }
                </button>
              </div>
            );
          })}
        </div>

        <div className="w-8 h-px bg-zinc-800 my-0.5" />

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          title="Create a Server"
          className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-500 bg-zinc-800/60 hover:bg-emerald-600 hover:text-white hover:rounded-2xl transition-all duration-200 text-xl font-light cursor-pointer"
        >
          +
        </button>
      </nav>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 w-96 shadow-2xl shadow-black/60"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-zinc-100 text-xl font-semibold text-center mb-1">Create a Server</h2>
            <p className="text-zinc-400 text-sm text-center mb-6">
              Give your community a name to get started.
            </p>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                  Server Name
                </label>
                <input
                  value={newServerName}
                  onChange={e => setNewServerName(e.target.value)}
                  placeholder="My Server"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
