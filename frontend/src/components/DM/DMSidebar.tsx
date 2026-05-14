import { useState, useEffect } from 'react';
import { DirectMessage, User } from '../../types';
import apiClient from '../../api/client';
import SettingsModal from './SettingsModal';

interface DMConversation {
  user: { id: string; username: string; avatar?: string | null; status: string };
  lastMessage: DirectMessage;
}

interface DMSidebarProps {
  conversations: DMConversation[];
  currentUserId: string;
  selectedUserId: string | null;
  currentUser: User;
  onSelectConversation: (userId: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  showSettings: boolean;
  onCloseSettings: () => void;
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
  DND: 'bg-red-500',
  OFFLINE: 'bg-zinc-600',
};

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-indigo-700', 'bg-blue-700',
  'bg-teal-700', 'bg-emerald-700', 'bg-rose-700',
];
function avatarColor(userId: string) {
  const n = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function DMSidebar({
  conversations, currentUserId, selectedUserId, currentUser,
  onSelectConversation, onLogout, showSettings, onCloseSettings,
}: DMSidebarProps) {
  const [showCompose, setShowCompose] = useState(false);

  return (
    <>
      <aside className="flex flex-col w-64 shrink-0 bg-zinc-900 border-r border-zinc-800/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/70 shrink-0">
          <span className="text-zinc-100 font-semibold text-base">Direct Messages</span>
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            title="New message"
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {conversations.length === 0 && (
            <p className="text-zinc-500 text-xs text-center mt-8 px-4">
              No conversations yet. Click the compose button to start one.
            </p>
          )}
          {conversations.map(({ user, lastMessage }) => {
            const isSelected = user.id === selectedUserId;
            const preview = lastMessage.senderId === currentUserId
              ? `You: ${lastMessage.content}`
              : lastMessage.content;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelectConversation(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  isSelected ? 'bg-zinc-700/60' : 'hover:bg-zinc-800/60'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden ${avatarColor(user.id)}`}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      : user.username.slice(0, 2).toUpperCase()
                    }
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${statusDot[user.status] || 'bg-zinc-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-200'}`}>
                    {user.username}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{preview}</p>
                </div>
              </button>
            );
          })}
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
            <p className="text-sm font-semibold text-zinc-100 truncate">{currentUser.username}</p>
            <p className="text-xs text-zinc-500 capitalize">{currentUser.status?.toLowerCase()}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Compose / new DM modal */}
      {showCompose && (
        <SettingsModal
          onClose={() => setShowCompose(false)}
          onSelectUser={userId => { setShowCompose(false); onSelectConversation(userId); }}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          onClose={onCloseSettings}
          onSelectUser={userId => { onCloseSettings(); onSelectConversation(userId); }}
        />
      )}
    </>
  );
}
