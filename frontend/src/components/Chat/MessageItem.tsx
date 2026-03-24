import React, { useState } from 'react';
import { Message, User } from '../../types';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MessageItem({ message, currentUser, onEdit, onDelete }: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [hovered, setHovered] = useState(false);
  const isOwn = message.author.id === currentUser.id;

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim()) {
      onEdit(message.id, editContent.trim());
      setEditing(false);
    }
  };

  const initials = message.author.username.slice(0, 2).toUpperCase();
  const avatarColor = '#' + (parseInt(message.author.id.slice(0, 6), 16) % 0xffffff).toString(16).padStart(6, '0');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', padding: '4px 16px', gap: '16px',
        background: hovered ? 'rgba(4,4,5,0.07)' : 'transparent',
        position: 'relative', alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: message.author.avatar ? 'transparent' : avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: '14px', overflow: 'hidden',
      }}>
        {message.author.avatar
          ? <img src={message.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{message.author.username}</span>
          <span style={{ fontSize: '11px', color: '#72767d' }}>{formatDate(message.createdAt)} at {formatTime(message.createdAt)}</span>
          {message.editedAt && <span style={{ fontSize: '10px', color: '#72767d' }}>(edited)</span>}
        </div>
        {editing ? (
          <form onSubmit={handleEditSubmit}>
            <input
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
              autoFocus
              style={{
                width: '100%', background: '#40444b', border: '1px solid #7289da',
                borderRadius: '4px', color: '#dcddde', padding: '8px', fontSize: '15px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#b9bbbe', marginTop: '4px' }}>
              Press Enter to save · Esc to cancel
            </div>
          </form>
        ) : (
          <div style={{ color: '#dcddde', fontSize: '15px', wordBreak: 'break-word', lineHeight: '1.4' }}>
            {message.content}
          </div>
        )}
        {message.files.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {message.files.map(f => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                style={{ color: '#7289da', fontSize: '13px' }}>
                📎 {f.originalName}
              </a>
            ))}
          </div>
        )}
        {message.reactions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <span key={emoji} style={{
                background: '#2f3136', border: '1px solid #40444b',
                borderRadius: '4px', padding: '2px 6px', fontSize: '13px', cursor: 'pointer',
              }}>
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
      {hovered && isOwn && !editing && (
        <div style={{
          position: 'absolute', right: '16px', top: '4px',
          display: 'flex', gap: '4px', background: '#2f3136',
          border: '1px solid #202225', borderRadius: '4px', padding: '2px 4px',
        }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'none', border: 'none', color: '#b9bbbe',
              cursor: 'pointer', padding: '4px 6px', fontSize: '13px', borderRadius: '3px',
            }}
            title="Edit"
          >✏️</button>
          <button
            onClick={() => onDelete(message.id)}
            style={{
              background: 'none', border: 'none', color: '#f04747',
              cursor: 'pointer', padding: '4px 6px', fontSize: '13px', borderRadius: '3px',
            }}
            title="Delete"
          >🗑️</button>
        </div>
      )}
    </div>
  );
}
