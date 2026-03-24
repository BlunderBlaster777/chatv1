import React, { useState } from 'react';
import { Server, Channel, User } from '../../types';

interface ChannelSidebarProps {
  server: Server | null;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export default function ChannelSidebar({
  server, channels, selectedChannelId, onSelectChannel, currentUser, onLogout,
}: ChannelSidebarProps) {
  const [showInvite, setShowInvite] = useState(false);
  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');

  const statusColor = { ONLINE: '#43b581', OFFLINE: '#747f8d', AWAY: '#faa61a', DND: '#f04747' };

  return (
    <div style={{
      width: '240px', background: '#2f3136', display: 'flex',
      flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Server header */}
      <div style={{
        padding: '16px', borderBottom: '1px solid #202225',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', fontWeight: 700, color: '#fff',
        background: '#2f3136',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {server ? server.name : 'Select a Server'}
        </span>
        {server && (
          <button
            onClick={() => setShowInvite(true)}
            title="Invite Code"
            style={{ background: 'none', border: 'none', color: '#b9bbbe', cursor: 'pointer', fontSize: '16px' }}
          >
            ⚙️
          </button>
        )}
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {textChannels.length > 0 && (
          <div>
            <div style={{ padding: '12px 16px 4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8e9297', letterSpacing: '0.02em' }}>
              Text Channels
            </div>
            {textChannels.map(ch => (
              <div
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                style={{
                  padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', margin: '1px 8px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: selectedChannelId === ch.id ? '#393c43' : 'transparent',
                  color: selectedChannelId === ch.id ? '#fff' : '#8e9297',
                }}
                onMouseEnter={e => {
                  if (selectedChannelId !== ch.id) {
                    (e.currentTarget as HTMLElement).style.background = '#34373c';
                    (e.currentTarget as HTMLElement).style.color = '#dcddde';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedChannelId !== ch.id) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#8e9297';
                  }
                }}
              >
                <span style={{ fontSize: '16px', opacity: 0.7 }}>#</span>
                <span style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.name}
                </span>
              </div>
            ))}
          </div>
        )}
        {voiceChannels.length > 0 && (
          <div>
            <div style={{ padding: '12px 16px 4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8e9297', letterSpacing: '0.02em' }}>
              Voice Channels
            </div>
            {voiceChannels.map(ch => (
              <div
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                style={{
                  padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', margin: '1px 8px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: selectedChannelId === ch.id ? '#393c43' : 'transparent',
                  color: selectedChannelId === ch.id ? '#fff' : '#8e9297',
                }}
              >
                <span style={{ fontSize: '14px', opacity: 0.7 }}>🔊</span>
                <span style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.name}
                </span>
              </div>
            ))}
          </div>
        )}
        {!server && (
          <div style={{ padding: '16px', color: '#72767d', fontSize: '14px', textAlign: 'center' }}>
            Select or create a server to get started
          </div>
        )}
      </div>

      {/* User profile footer */}
      <div style={{
        padding: '8px', background: '#292b2f',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#7289da', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px',
            overflow: 'hidden',
          }}>
            {currentUser.avatar
              ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : currentUser.username.slice(0, 2).toUpperCase()
            }
          </div>
          <div style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: statusColor[currentUser.status] || '#747f8d',
            border: '2px solid #292b2f',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.username}
          </div>
          <div style={{ color: '#b9bbbe', fontSize: '11px' }}>
            {currentUser.status?.toLowerCase() || 'online'}
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Log Out"
          style={{ background: 'none', border: 'none', color: '#b9bbbe', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
        >
          ↪
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && server?.inviteCode && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setShowInvite(false)}
        >
          <div
            style={{ background: '#36393f', borderRadius: '8px', padding: '24px', width: '400px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Server Invite Code</h3>
            <div style={{
              background: '#202225', borderRadius: '4px', padding: '10px',
              color: '#7289da', fontFamily: 'monospace', fontSize: '14px',
              marginBottom: '12px', wordBreak: 'break-all',
            }}>
              {server.inviteCode}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(server.inviteCode || ''); }}
              style={{ background: '#7289da', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '8px 16px', fontSize: '14px' }}
            >
              Copy Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
