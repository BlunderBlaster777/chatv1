import { useState, useRef, useCallback } from 'react';
import { Channel } from '../../types';
import { useSocket } from '../../contexts/SocketContext';
import apiClient from '../../api/client';
import { useToast } from '../Notifications/ToastNotification';

interface MessageInputProps {
  channel: Channel;
  onSendMessage: (content: string) => void;
}

export default function MessageInput({ channel, onSendMessage }: MessageInputProps) {
  const [content, setContent] = useState('');
  const { socket } = useSocket();
  const { showToast } = useToast();
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startTyping = useCallback(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      socket?.emit('typing:start', { channelId: channel.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      socket?.emit('typing:stop', { channelId: channel.id });
    }, 2000);
  }, [socket, channel.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setContent('');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingRef.current = false;
    socket?.emit('typing:stop', { channelId: channel.id });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('File uploaded!', 'success');
    } catch {
      showToast('File upload failed', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', background: '#40444b',
        borderRadius: '8px', padding: '0 8px',
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'none', border: 'none', color: '#b9bbbe',
            cursor: 'pointer', padding: '12px 8px', fontSize: '20px', lineHeight: 1,
          }}
          title="Upload file"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <input
          value={content}
          onChange={e => { setContent(e.target.value); startTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channel.name}`}
          style={{
            flex: 1, background: 'none', border: 'none', color: '#dcddde',
            fontSize: '15px', padding: '12px 8px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          style={{
            background: content.trim() ? '#7289da' : '#40444b',
            border: 'none', borderRadius: '4px', color: content.trim() ? '#fff' : '#72767d',
            cursor: content.trim() ? 'pointer' : 'default',
            padding: '6px 12px', fontSize: '14px', fontWeight: 700, transition: 'all 0.15s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
