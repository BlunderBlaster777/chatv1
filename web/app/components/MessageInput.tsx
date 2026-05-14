'use client';
import { useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MessageInput({
  channelName,
  onSend,
  onTyping,
}: {
  channelName: string;
  onSend: (content: string, attachmentUrl?: string) => void;
  onTyping: () => void;
}) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    onTyping();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function send(attachmentUrl?: string) {
    const content = text.trim();
    if (!content && !attachmentUrl) return;
    onSend(content, attachmentUrl);
    setText('');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const { url } = await res.json();
    setUploading(false);
    send(url);
    e.target.value = '';
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-end gap-2 bg-discord-input rounded-lg px-3 py-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="text-discord-muted hover:text-white text-xl shrink-0 mb-0.5"
          title="Attach file"
        >
          {uploading ? '⌛' : '+'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        <textarea
          rows={1}
          className="flex-1 bg-transparent text-discord-text resize-none outline-none text-sm placeholder:text-discord-muted max-h-32 overflow-y-auto"
          placeholder={`Message #${channelName}`}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
        />
        <button
          onClick={() => send()}
          className="text-discord-muted hover:text-discord-accent shrink-0 mb-0.5 text-lg"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
