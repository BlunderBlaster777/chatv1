import React, { useEffect, useRef } from 'react';
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

  return (
    <div style={{
      flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      paddingTop: '16px', paddingBottom: '8px',
    }}>
      {messages.length === 0 && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: '#72767d',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dcddde', marginBottom: '8px' }}>
            No messages yet
          </div>
          <div>Be the first to say something!</div>
        </div>
      )}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUser={currentUser}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 16px', fontSize: '13px', color: '#b9bbbe', fontStyle: 'italic' }}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
