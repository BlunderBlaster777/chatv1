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
    <div className="px-3 lg:px-5 pb-3 lg:pb-4 shrink-0 bg-[#0f131d]">
      <div className="rounded-2xl border border-white/8 bg-[#121925] px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.2)] focus-within:border-white/12 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="File upload"
        />
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => runtimeConfig.fileUploadsEnabled && fileInputRef.current?.click()}
            title={runtimeConfig.fileUploadsEnabled ? 'Attach file' : 'File uploads disabled in this deployment'}
            disabled={!runtimeConfig.fileUploadsEnabled}
            className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 shrink-0 disabled:text-slate-700 disabled:bg-transparent disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); startTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel.name}`}
              rows={1}
              aria-label={`Message #${channel.name}`}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-[15px] resize-none outline-none leading-6 max-h-40 overflow-y-auto no-scrollbar pt-1"
            />
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/6 pt-2 text-[11px] text-slate-500">
              <span className="truncate">Enter to send, Shift + Enter for a new line</span>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title="Send message"
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 transition-all shrink-0 ${
                  canSend
                    ? 'bg-gradient-to-r from-[#4c7dff] via-[#775dff] to-[#ff4fb9] text-white hover:brightness-110'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
