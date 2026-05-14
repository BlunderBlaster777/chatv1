import { ServerMember } from '../../types';

interface MemberListProps {
  members: ServerMember[];
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
  DND: 'bg-red-500',
  OFFLINE: 'bg-zinc-600',
};

export default function MemberList({ members }: MemberListProps) {
  const online = members.filter(m => m.user.status !== 'OFFLINE');
  const offline = members.filter(m => m.user.status === 'OFFLINE');

  return (
    <aside className="flex flex-col w-[15rem] shrink-0 bg-[#0c111a] border-l border-white/8 overflow-y-auto py-3">
      {online.length > 0 && (
        <section className="mb-2">
          <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Online — {online.length}
          </p>
          {online.map(m => <MemberRow key={m.id} member={m} />)}
        </section>
      )}

      {offline.length > 0 && (
        <section>
          <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Offline — {offline.length}
          </p>
          {offline.map(m => <MemberRow key={m.id} member={m} />)}
        </section>
      )}

      {members.length === 0 && (
        <p className="text-slate-500 text-xs text-center mt-8 px-4">No members</p>
      )}
    </aside>
  );
}

function MemberRow({ member }: { member: ServerMember }) {
  const initials = member.user.username.slice(0, 2).toUpperCase();
  const isOffline = member.user.status === 'OFFLINE';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default">
      <div className="relative shrink-0">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#4c7dff] via-[#775dff] to-[#ff4fb9] flex items-center justify-center text-white text-sm font-bold overflow-hidden ${isOffline ? 'opacity-40' : ''}`}>
          {member.user.avatar
            ? <img src={member.user.avatar} alt="" className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0c111a] ${statusDot[member.user.status] || 'bg-zinc-600'}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${isOffline ? 'text-slate-500' : 'text-slate-200'}`}>
          {member.user.username}
        </p>
        {member.role !== 'MEMBER' && (
          <p className="text-xs text-sky-400">{member.role}</p>
        )}
      </div>
    </div>
  );
}
