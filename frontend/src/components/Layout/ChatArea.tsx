import { Channel, Message, User } from '../../types';
import MessageList from '../Chat/MessageList';
import MessageInput from '../Chat/MessageInput';
import VoiceCall from '../Voice/VoiceCall';
import { runtimeConfig } from '../../config/runtime';

interface ChatAreaProps {
  channel: Channel | null;
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  typingUsers: string[];
  onMenuOpen?: () => void;
  onMembersOpen?: () => void;
}

export default function ChatArea({
  channel, messages, currentUser, onSendMessage, onEditMessage, onDeleteMessage,
  typingUsers, onMenuOpen, onMembersOpen,
}: ChatAreaProps) {
  if (!channel) {
    return (
      <div className="flex-1 flex flex-col bg-[#0f131d] min-w-0">
        {/* Mobile top bar even when no channel selected */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0 lg:hidden bg-[#0f131d]">
          <button
            type="button"
            onClick={onMenuOpen}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-slate-400 text-sm font-medium">BlockChat</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 px-8">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <p className="text-slate-200 font-semibold text-base mb-1">No channel selected</p>
          <p className="text-slate-500 text-sm text-center">Pick a channel from the sidebar to start chatting.</p>
        </div>
      </div>
    );
  }

  const isVoice = channel.type === 'VOICE';

  return (
    <div className="flex-1 flex flex-col bg-[#0f131d] min-w-0 min-h-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-white/8 shrink-0 bg-[#10151f]">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="lg:hidden text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <span className="text-slate-500 font-semibold text-base select-none shrink-0">
          {isVoice ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 5a5 5 0 015 5v1a5 5 0 01-10 0v-1a5 5 0 015-5zm0 14a9 9 0 009-9H18a7 7 0 01-14 0H2a9 9 0 009 9z"/>
            </svg>
          ) : '#'}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-slate-100 font-semibold text-[15px] truncate">{channel.name}</h1>
          <p className="hidden sm:block text-xs text-slate-500 truncate">
            {isVoice ? 'Voice channel' : 'Text channel'}
          </p>
        </div>

        {/* Members toggle — mobile only */}
        <button
          type="button"
          onClick={onMembersOpen}
          className="lg:hidden text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
          aria-label="Show members"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </button>
      </header>

      {isVoice && runtimeConfig.realtimeEnabled && <VoiceCall channel={channel} currentUser={currentUser} />}

      {isVoice && !runtimeConfig.realtimeEnabled && (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-zinc-400">
          <div className="max-w-md rounded-xl border border-white/8 bg-white/[0.03] px-6 py-8">
            <p className="text-slate-100 font-semibold mb-2">Voice is disabled in the Cloudflare deployment</p>
            <p className="text-sm leading-6 text-slate-400">This project now deploys cleanly to Pages and Workers, but voice and other Socket.IO features need a Durable Object based realtime layer before they can run on Cloudflare.</p>
          </div>
        </div>
      )}

      {!isVoice && (
        <>
          <MessageList
            messages={messages}
            currentUser={currentUser}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            typingUsers={typingUsers}
          />
          <MessageInput channel={channel} onSendMessage={onSendMessage} />
        </>
      )}
    </div>
  );
}
