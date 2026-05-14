'use client';

interface Member { userId: string; username: string; online: boolean }

export default function MemberList({ members }: { members: Member[] }) {
  const online = members.filter(m => m.online);
  const offline = members.filter(m => !m.online);

  return (
    <aside className="hidden lg:flex flex-col w-48 shrink-0 bg-discord-sidebar border-l border-black/20 p-3 gap-1">
      {online.length > 0 && (
        <>
          <p className="text-discord-muted text-xs uppercase font-semibold tracking-wide px-2 mb-1">
            Online — {online.length}
          </p>
          {online.map(m => <MemberRow key={m.userId} member={m} />)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <p className="text-discord-muted text-xs uppercase font-semibold tracking-wide px-2 mt-3 mb-1">
            Offline — {offline.length}
          </p>
          {offline.map(m => <MemberRow key={m.userId} member={m} />)}
        </>
      )}
    </aside>
  );
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-discord-hover">
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
          {member.username[0].toUpperCase()}
        </div>
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-discord-sidebar ${
          member.online ? 'bg-green-500' : 'bg-discord-muted'
        }`} />
      </div>
      <span className="text-discord-muted text-sm truncate">{member.username}</span>
    </div>
  );
}
