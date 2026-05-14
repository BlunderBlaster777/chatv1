import { useState, useRef, useCallback } from 'react';
import { Channel } from '../../types';
import { useSocket } from '../../contexts/SocketContext';
import apiClient from '../../api/client';
import { useToast } from '../Notifications/ToastNotification';
import { runtimeConfig } from '../../config/runtime';

interface MessageInputProps {
  channel: Channel;
  onSendMessage: (content: string) => void;
}

export default function MessageInput({ channel, onSendMessage }: MessageInputProps) {
  const [content, setContent] = useState('');
  const { socket, realtimeEnabled } = useSocket();
  const { showToast } = useToast();
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startTyping = useCallback(() => {
    if (!realtimeEnabled) return;
    if (!typingRef.current) {
      typingRef.current = true;
      socket?.emit('typing:start', { channelId: channel.id });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      socket?.emit('typing:stop', { channelId: channel.id });
    }, 2000);
  }, [socket, channel.id, realtimeEnabled]);

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
    if (realtimeEnabled) socket?.emit('typing:stop', { channelId: channel.id });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!runtimeConfig.fileUploadsEnabled) {
      showToast('File uploads are disabled for this deployment', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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

  const canSend = content.trim().length > 0;

  return (
    <div className="px-3 lg:px-4 pb-3 lg:pb-4 shrink-0">
      <div className="flex items-end gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
        <button
          type="button"
          onClick={() => runtimeConfig.fileUploadsEnabled && fileInputRef.current?.click()}
          title={runtimeConfig.fileUploadsEnabled ? 'Attach file' : 'File uploads disabled in this deployment'}
          disabled={!runtimeConfig.fileUploadsEnabled}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 shrink-0 mb-0.5 disabled:text-zinc-700 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="File upload"
        />
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); startTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channel.name}`}
          rows={1}
          aria-label={`Message #${channel.name}`}
          className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-base resize-none outline-none leading-relaxed max-h-40 overflow-y-auto no-scrollbar"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          title="Send message"
          className={`p-1.5 rounded-lg transition-all shrink-0 mb-0.5 ${
            canSend
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
