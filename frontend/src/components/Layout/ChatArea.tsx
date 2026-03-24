import React from 'react';
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
}

export default function ChatArea({
  channel, messages, currentUser, onSendMessage, onEditMessage, onDeleteMessage, typingUsers,
}: ChatAreaProps) {
  if (!channel) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#36393f',
        color: '#72767d',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#dcddde', marginBottom: '8px' }}>
          Select a channel
        </div>
        <div>Pick a channel from the left sidebar to start chatting</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#36393f', minWidth: 0 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #202225',
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#36393f', flexShrink: 0,
      }}>
        <span style={{ color: '#8e9297', fontSize: '20px', fontWeight: 700 }}>
          {channel.type === 'VOICE' ? '🔊' : '#'}
        </span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{channel.name}</span>
      </div>

      {/* Voice channel UI */}
      {channel.type === 'VOICE' && (
        <VoiceCall channel={channel} currentUser={currentUser} />
      )}

      {/* Messages */}
      {channel.type === 'TEXT' && (
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
