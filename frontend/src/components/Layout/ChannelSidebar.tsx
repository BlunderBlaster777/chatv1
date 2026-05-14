import { useState } from 'react';
import { Server, Channel, User } from '../../types';
import ServerSettingsModal from '../Server/ServerSettingsModal';

interface ChannelSidebarProps {
  server: Server | null;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  currentUser: User;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onLogout: () => void;
  onOpenSettings: () => void;
  onChannelsChanged: () => void;
  onMembersChanged: () => void;
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
  DND: 'bg-red-500',
  OFFLINE: 'bg-zinc-600',
};

export default function ChannelSidebar({
  server, channels, selectedChannelId, onSelectChannel, currentUser,
  currentUserRole, onLogout, onOpenSettings, onChannelsChanged, onMembersChanged,
}: ChannelSidebarProps) {
  const [showServerSettings, setShowServerSettings] = useState(false);
  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');

  const canManageServer = server && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN');

  return (
    <>
      <aside className="flex flex-col w-64 shrink-0 bg-zinc-900 border-r border-zinc-800/50">
        {/* Server header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/70 shrink-0">
          <span className="text-zinc-100 font-semibold text-base truncate">
            {server ? server.name : 'BlockChat'}
          </span>
          {canManageServer && (
            <button
              type="button"
              onClick={() => setShowServerSettings(true)}
              title="Server settings"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {!server && (
            <p className="text-zinc-500 text-xs text-center mt-8 px-4">
              Select or create a server to get started.
            </p>
          )}

          {textChannels.length > 0 && (
            <div className="mb-3">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Text Channels
              </p>
              {textChannels.map(ch => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isSelected={ch.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          )}

          {voiceChannels.length > 0 && (
            <div>
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Voice Channels
              </p>
              {voiceChannels.map(ch => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isSelected={ch.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="flex items-center gap-3 px-3 py-3 bg-zinc-950/50 border-t border-zinc-800/50 shrink-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
              {currentUser.avatar
                ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                : currentUser.username.slice(0, 2).toUpperCase()
              }
            </div>
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${statusDot[currentUser.status] || 'bg-zinc-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-100 text-sm font-semibold truncate">{currentUser.username}</p>
            <p className="text-zinc-500 text-xs capitalize">{currentUser.status?.toLowerCase() || 'online'}</p>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Find people"
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Server settings modal */}
      {showServerSettings && server && (
        <ServerSettingsModal
          serverId={server.id}
          serverName={server.name}
          currentUserRole={currentUserRole}
          onClose={() => setShowServerSettings(false)}
          onChannelsChanged={() => { onChannelsChanged(); setShowServerSettings(false); }}
          onMembersChanged={onMembersChanged}
        />
      )}
    </>
  );
}

function ChannelItem({ channel, isSelected, onSelect }: {
  channel: Channel;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const isVoice = channel.type === 'VOICE';
  return (
    <button
      type="button"
      onClick={() => onSelect(channel.id)}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
        isSelected
          ? 'bg-zinc-700/60 text-zinc-100 font-medium'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
      ].join(' ')}
    >
      <span className="text-zinc-500 text-xs w-3.5 shrink-0 text-center">
        {isVoice ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 5a5 5 0 015 5v1a5 5 0 01-10 0v-1a5 5 0 015-5zm0 14a9 9 0 009-9H18a7 7 0 01-14 0H2a9 9 0 009 9z"/>
          </svg>
        ) : '#'}
      </span>
      <span className="truncate">{channel.name}</span>
      {channel.minRole && channel.minRole !== 'MEMBER' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 ml-auto shrink-0" title={`${channel.minRole}+`}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      )}
    </button>
  );
}
