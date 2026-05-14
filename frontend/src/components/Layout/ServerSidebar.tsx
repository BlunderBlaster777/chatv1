import { useState } from 'react';
import { Server, User } from '../../types';

interface ServerSidebarProps {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onCreateServer: (name: string) => void;
  currentUser: User;
}

export default function ServerSidebar({
  servers, selectedServerId, onSelectServer, onCreateServer,
}: ServerSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newServerName.trim()) {
      onCreateServer(newServerName.trim());
      setNewServerName('');
      setShowCreate(false);
    }
  };

  return (
    <div style={{
      width: '72px', background: '#202225', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      padding: '12px 0', gap: '8px', overflowY: 'auto', flexShrink: 0,
    }}>
      {/* Home button */}
      <div
        title="Home"
        style={{
          width: '48px', height: '48px', borderRadius: '50%', background: '#7289da',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', fontSize: '20px', flexShrink: 0,
          transition: 'border-radius 0.15s',
        }}
      >
        🏠
      </div>
      <div style={{ width: '32px', height: '2px', background: '#dcddde22', borderRadius: '1px' }} />

      {servers.map(server => {
        const isSelected = server.id === selectedServerId;
        const initials = server.name.slice(0, 2).toUpperCase();
        return (
          <div
            key={server.id}
            onClick={() => onSelectServer(server.id)}
            title={server.name}
            style={{
              position: 'relative', width: '48px', height: '48px',
              borderRadius: isSelected ? '16px' : '50%',
              background: server.icon ? 'transparent' : '#7289da',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '14px',
              flexShrink: 0, transition: 'border-radius 0.15s, background 0.15s',
              overflow: 'hidden', border: isSelected ? '2px solid #7289da' : '2px solid transparent',
            }}
          >
            {server.icon
              ? <img src={server.icon} alt={server.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
            {isSelected && (
              <div style={{
                position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)',
                width: '4px', height: '80%', background: '#fff', borderRadius: '0 2px 2px 0',
              }} />
            )}
          </div>
        );
      })}

      {/* Add server */}
      <div
        onClick={() => setShowCreate(true)}
        title="Add a Server"
        style={{
          width: '48px', height: '48px', borderRadius: '50%', background: '#36393f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#43b581', fontSize: '24px', fontWeight: 300,
          flexShrink: 0, transition: 'border-radius 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderRadius = '16px';
          (e.currentTarget as HTMLElement).style.background = '#43b581';
          (e.currentTarget as HTMLElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderRadius = '50%';
          (e.currentTarget as HTMLElement).style.background = '#36393f';
          (e.currentTarget as HTMLElement).style.color = '#43b581';
        }}
      >
        +
      </div>

      {/* Create server modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: '#36393f', borderRadius: '8px', padding: '24px',
              width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', marginBottom: '8px', textAlign: 'center' }}>Create a Server</h2>
            <p style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
              Give your server a name.
            </p>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#b9bbbe', marginBottom: '8px' }}>
                Server Name
              </label>
              <input
                value={newServerName}
                onChange={e => setNewServerName(e.target.value)}
                placeholder="My Awesome Server"
                autoFocus
                style={{
                  width: '100%', padding: '10px', background: '#202225',
                  border: '1px solid #040405', borderRadius: '4px',
                  color: '#dcddde', fontSize: '16px', outline: 'none', marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  background: 'none', border: 'none', color: '#b9bbbe',
                  cursor: 'pointer', padding: '8px 16px', fontSize: '14px',
                }}>Cancel</button>
                <button type="submit" style={{
                  background: '#7289da', border: 'none', borderRadius: '4px',
                  color: '#fff', cursor: 'pointer', padding: '8px 16px',
                  fontSize: '14px', fontWeight: 700,
                }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
