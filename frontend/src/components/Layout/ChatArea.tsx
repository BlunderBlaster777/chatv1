import { Channel, Message, User } from '../../types';
import MessageList from '../Chat/MessageList';
import MessageInput from '../Chat/MessageInput';
import VoiceCall from '../Voice/VoiceCall';

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
      <div className="flex-1 flex flex-col bg-zinc-900 min-w-0">
        {/* Mobile top bar even when no channel selected */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/70 shrink-0 lg:hidden">
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
          <span className="text-zinc-400 text-sm">BlockChat</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <p className="text-zinc-300 font-semibold text-base mb-1">No channel selected</p>
          <p className="text-zinc-500 text-sm text-center px-8">Pick a channel from the sidebar to start chatting.</p>
        </div>
      </div>
    );
  }

  const isVoice = channel.type === 'VOICE';

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 min-w-0">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 lg:px-5 py-3 border-b border-zinc-800/70 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <span className="text-zinc-500 font-semibold text-base select-none shrink-0">
          {isVoice ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 5a5 5 0 015 5v1a5 5 0 01-10 0v-1a5 5 0 015-5zm0 14a9 9 0 009-9H18a7 7 0 01-14 0H2a9 9 0 009 9z"/>
            </svg>
          ) : '#'}
        </span>
        <h1 className="text-zinc-100 font-semibold text-base flex-1 truncate">{channel.name}</h1>

        {/* Members toggle — mobile only */}
        <button
          type="button"
          onClick={onMembersOpen}
          className="lg:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
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

      {isVoice && <VoiceCall channel={channel} currentUser={currentUser} />}

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
