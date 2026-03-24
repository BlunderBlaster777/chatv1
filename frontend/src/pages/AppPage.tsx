import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../components/Notifications/ToastNotification';
import MainLayout from '../components/Layout/MainLayout';
import apiClient from '../api/client';
import { Server, Channel, Message, ServerMember } from '../types';

export default function AppPage() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
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
      setMessages(prev => [...prev, message]);
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

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedChannel || !socket) return;
    socket.emit('chat:message', { channelId: selectedChannel.id, content });
  }, [selectedChannel, socket]);

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

  if (!user) return null;

  return (
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
    />
  );
}
