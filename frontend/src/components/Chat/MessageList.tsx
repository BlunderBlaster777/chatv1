import { useEffect, useRef } from 'react';
import { Message, User } from '../../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  typingUsers: string[];
}

export default function MessageList({ messages, currentUser, onEdit, onDelete, typingUsers }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <p className="text-zinc-300 font-semibold text-sm mb-1">No messages yet</p>
        <p className="text-zinc-500 text-xs">Be the first to say something.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col py-4">
      {messages.map((message, i) => {
        const prev = messages[i - 1];
        const isGrouped =
          prev &&
          prev.author.id === message.author.id &&
          new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
        return (
          <MessageItem
            key={message.id}
            message={message}
            currentUser={currentUser}
            onEdit={onEdit}
            onDelete={onDelete}
            isGrouped={isGrouped}
          />
        );
      })}

      {typingUsers.length > 0 && (
        <p className="px-5 pt-1 pb-2 text-xs text-zinc-500 italic">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
        </p>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
