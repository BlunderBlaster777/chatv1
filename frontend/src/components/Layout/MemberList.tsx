import { ServerMember } from '../../types';

interface MemberListProps {
  members: ServerMember[];
}

const statusColor: Record<string, string> = {
  ONLINE: '#43b581', OFFLINE: '#747f8d', AWAY: '#faa61a', DND: '#f04747',
};

export default function MemberList({ members }: MemberListProps) {
  const online = members.filter(m => m.user.status === 'ONLINE' || m.user.status === 'AWAY' || m.user.status === 'DND');
  const offline = members.filter(m => m.user.status === 'OFFLINE');

  const renderMember = (member: ServerMember) => {
    const initials = member.user.username.slice(0, 2).toUpperCase();
    return (
      <div key={member.id} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '6px 8px', borderRadius: '4px', cursor: 'default',
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#34373c'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#7289da', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px',
            overflow: 'hidden',
            opacity: member.user.status === 'OFFLINE' ? 0.5 : 1,
          }}>
            {member.user.avatar
              ? <img src={member.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: statusColor[member.user.status] || '#747f8d',
            border: '2px solid #2f3136',
          }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: member.user.status === 'OFFLINE' ? '#72767d' : '#dcddde',
            fontSize: '14px', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.user.username}
          </div>
          {member.role !== 'MEMBER' && (
            <div style={{ fontSize: '11px', color: '#7289da' }}>{member.role}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '240px', background: '#2f3136', flexShrink: 0,
      overflowY: 'auto', padding: '12px 0',
    }}>
      {online.length > 0 && (
        <>
          <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8e9297', letterSpacing: '0.02em' }}>
            Online — {online.length}
          </div>
          {online.map(renderMember)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <div style={{ padding: '16px 16px 4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8e9297', letterSpacing: '0.02em' }}>
            Offline — {offline.length}
          </div>
          {offline.map(renderMember)}
        </>
      )}
      {members.length === 0 && (
        <div style={{ padding: '16px', color: '#72767d', fontSize: '14px', textAlign: 'center' }}>
          No members
        </div>
      )}
    </div>
  );
}
