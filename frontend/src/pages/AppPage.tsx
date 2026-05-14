import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../components/Notifications/ToastNotification';
import MainLayout from '../components/Layout/MainLayout';
import SettingsModal from '../components/DM/SettingsModal';
import apiClient from '../api/client';
import { Server, Channel, Message, ServerMember } from '../types';

export default function AppPage() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { showNotification } = useNotifications();
  const { showToast } = useToast();

  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Load servers on mount
  useEffect(() => {
    apiClient.get('/servers').then(({ data }) => {
      setServers(data);
      if (data.length > 0) handleSelectServer(data[0].id, data);
    }).catch(() => {});
  }, []);

  const handleSelectServer = useCallback(async (serverId: string, serverList?: Server[]) => {
    const list = serverList || servers;
    const server = list.find(s => s.id === serverId);
    if (!server) return;
    setSelectedServer(server);
    setMessages([]);
    setSelectedChannel(null);
    socket?.emit('server:join', serverId);
    try {
      const [channelsRes, membersRes] = await Promise.all([
        apiClient.get(`/servers/${serverId}/channels`),
        apiClient.get(`/servers/${serverId}/members`),
      ]);
      setChannels(channelsRes.data);
      setMembers(membersRes.data);
      const textChannels = channelsRes.data.filter((c: Channel) => c.type === 'TEXT');
      if (textChannels.length > 0) handleSelectChannel(textChannels[0].id, channelsRes.data);
    } catch {}
  }, [servers, socket]);

  const handleSelectChannel = useCallback(async (channelId: string, channelList?: Channel[]) => {
    const list = channelList || channels;
    const channel = list.find(c => c.id === channelId);
    if (!channel) return;
    if (selectedChannel) socket?.emit('channel:leave', selectedChannel.id);
    setSelectedChannel(channel);
    socket?.emit('channel:join', channelId);
    setMessages([]);
    setTypingUsers([]);
    if (channel.type === 'TEXT') {
      try {
        const { data } = await apiClient.get(`/channels/${channelId}/messages`);
        setMessages(data);
      } catch {}
    }
  }, [channels, selectedChannel, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', (message: Message) => {
      setMessages(prev => {
        // Replace the optimistic placeholder (temp-*) for this author+content if present,
        // otherwise just append. This prevents the message appearing twice.
        const idx = prev.findIndex(
          m => m.id.startsWith('temp-') && m.author.id === message.author.id && m.content === message.content
        );
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = message;
          return next;
        }
        return [...prev, message];
      });
      if (message.author.id !== user?.id) {
        showNotification(`${message.author.username}`, message.content);
      }
    });

    socket.on('chat:edit', (updated: Message) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    });

    socket.on('chat:delete', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on('chat:reaction', (updated: Message) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    });

    socket.on('typing:start', ({ userId }: { userId: string }) => {
      if (userId === user?.id) return;
      const member = members.find(m => m.user.id === userId);
      const name = member?.user.username || userId;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
    });

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      const member = members.find(m => m.user.id === userId);
      const name = member?.user.username || userId;
      setTypingUsers(prev => prev.filter(u => u !== name));
    });

    socket.on('presence:update', ({ userId, status }: { userId: string; status: string }) => {
      setMembers(prev => prev.map(m =>
        m.user.id === userId ? { ...m, user: { ...m.user, status } } : m
      ));
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:edit');
      socket.off('chat:delete');
      socket.off('chat:reaction');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:update');
    };
  }, [socket, user, members, showNotification]);

  // Re-join the channel room when socket connects OR when selectedChannel changes.
  // The initial channel:join fires before the socket is ready (race condition),
  // so this covers both: socket-connects-after-channel-set, and channel-set-after-socket-connects.
  useEffect(() => {
    if (!socket || !selectedChannel) return;
    socket.emit('channel:join', selectedChannel.id);
  }, [socket, selectedChannel?.id]);

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedChannel || !socket || !user) return;
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content,
      authorId: user.id,
      channelId: selectedChannel.id,
      createdAt: new Date().toISOString(),
      editedAt: null,
      author: { id: user.id, username: user.username, avatar: user.avatar },
      reactions: [],
      files: [],
    };
    setMessages(prev => [...prev, optimistic]);
    socket.emit('chat:message', { channelId: selectedChannel.id, content });
  }, [selectedChannel, socket, user]);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    socket?.emit('chat:edit', { messageId, content });
  }, [socket]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    socket?.emit('chat:delete', { messageId });
  }, [socket]);

  const handleCreateServer = useCallback(async (name: string) => {
    try {
      const { data } = await apiClient.post('/servers', { name });
      setServers(prev => [...prev, data]);
      handleSelectServer(data.id, [...servers, data]);
      showToast(`Server "${name}" created!`, 'success');
    } catch {
      showToast('Failed to create server', 'error');
    }
  }, [servers, showToast]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Derive current user's role in the selected server from the members list
  const currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' =
    (members.find(m => m.user.id === user?.id)?.role as 'OWNER' | 'ADMIN' | 'MEMBER') || 'MEMBER';

  // Re-fetch channels after settings changes (channel created/deleted/permission changed)
  const handleChannelsChanged = useCallback(() => {
    if (selectedServer) {
      apiClient.get(`/servers/${selectedServer.id}/channels`).then(({ data }) => setChannels(data)).catch(() => {});
    }
  }, [selectedServer]);

  // Re-fetch members after settings changes
  const handleMembersChanged = useCallback(() => {
    if (selectedServer) {
      apiClient.get(`/servers/${selectedServer.id}/members`).then(({ data }) => setMembers(data)).catch(() => {});
    }
  }, [selectedServer]);

  if (!user) return null;

  return (
    <>
      <MainLayout
        servers={servers}
        selectedServer={selectedServer}
        channels={channels}
        selectedChannel={selectedChannel}
        messages={messages}
        members={members}
        currentUser={user}
        typingUsers={typingUsers}
        onSelectServer={(id) => handleSelectServer(id)}
        onSelectChannel={(id) => handleSelectChannel(id)}
        onCreateServer={handleCreateServer}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onLogout={handleLogout}
        onOpenDMs={() => navigate('/app/dm')}
        onOpenSettings={() => setShowSettings(true)}
        currentUserRole={currentUserRole}
        onChannelsChanged={handleChannelsChanged}
        onMembersChanged={handleMembersChanged}
      />
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSelectUser={uid => { setShowSettings(false); navigate(`/app/dm/${uid}`); }}
        />
      )}
    </>
  );
}
