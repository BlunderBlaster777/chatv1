import { useState } from 'react';
import { Message, User } from '../../types';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  isGrouped?: boolean;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `Today at ${formatTime(dateStr)}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + formatTime(dateStr);
}

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-indigo-700', 'bg-blue-700',
  'bg-teal-700', 'bg-emerald-700', 'bg-rose-700',
];

function avatarColor(userId: string) {
  const n = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function MessageItem({ message, currentUser, onEdit, onDelete, isGrouped }: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [hovered, setHovered] = useState(false);
  const isOwn = message.author.id === currentUser.id;
  const initials = message.author.username.slice(0, 2).toUpperCase();

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim()) {
      onEdit(message.id, editContent.trim());
      setEditing(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex gap-3.5 px-3 lg:px-5 group ${isGrouped ? 'pt-0.5 pb-0.5' : 'pt-3 pb-0.5'} ${hovered ? 'bg-zinc-800/30' : ''} transition-colors`}
    >
      {/* Avatar or time gutter */}
      <div className="w-9 shrink-0 flex justify-center">
        {isGrouped ? (
          <span className={`text-[10px] text-zinc-600 mt-1 leading-none ${hovered ? 'opacity-100' : 'opacity-0'} transition-opacity select-none`}>
            {formatTime(message.createdAt)}
          </span>
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 mt-0.5 ${avatarColor(message.author.id)}`}>
            {message.author.avatar
              ? <img src={message.author.avatar} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-zinc-100 font-semibold text-base">{message.author.username}</span>
            <span className="text-zinc-500 text-xs">{formatDateTime(message.createdAt)}</span>
            {message.editedAt && <span className="text-zinc-600 text-xs">(edited)</span>}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleEditSubmit} className="mt-0.5">
            <input
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
              autoFocus
              aria-label="Edit message"
              className="w-full bg-zinc-800 border border-violet-500/50 rounded-lg px-3 py-2 text-zinc-100 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Enter to save · Esc to cancel</p>
          </form>
        ) : (
          <p className="text-zinc-200 text-base leading-relaxed break-words">
            {message.content}
            {isGrouped && message.editedAt && (
              <span className="text-zinc-600 text-[10px] ml-1">(edited)</span>
            )}
          </p>
        )}

        {message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.files.map(f => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
                {f.originalName}
              </a>
            ))}
          </div>
        )}

        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700/60 hover:border-violet-500/50 rounded-full px-2 py-0.5 text-xs cursor-pointer transition-colors"
              >
                {emoji}
                <span className="text-zinc-400">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && isOwn && !editing && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-zinc-800 border border-zinc-700/60 rounded-lg px-1 py-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            title="Delete"
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
