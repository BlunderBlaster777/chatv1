import React from 'react';
import { Server, Channel, Message, ServerMember, User } from '../../types';
import ServerSidebar from './ServerSidebar';
import ChannelSidebar from './ChannelSidebar';
import ChatArea from './ChatArea';
import MemberList from './MemberList';

interface MainLayoutProps {
  servers: Server[];
  selectedServer: Server | null;
  channels: Channel[];
  selectedChannel: Channel | null;
  messages: Message[];
  members: ServerMember[];
  currentUser: User;
  typingUsers: string[];
  onSelectServer: (serverId: string) => void;
  onSelectChannel: (channelId: string) => void;
  onCreateServer: (name: string) => void;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onLogout: () => void;
}

export default function MainLayout({
  servers, selectedServer, channels, selectedChannel, messages,
  members, currentUser, typingUsers,
  onSelectServer, onSelectChannel, onCreateServer,
  onSendMessage, onEditMessage, onDeleteMessage, onLogout,
}: MainLayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ServerSidebar
        servers={servers}
        selectedServerId={selectedServer?.id || null}
        onSelectServer={onSelectServer}
        onCreateServer={onCreateServer}
        currentUser={currentUser}
      />
      <ChannelSidebar
        server={selectedServer}
        channels={channels}
        selectedChannelId={selectedChannel?.id || null}
        onSelectChannel={onSelectChannel}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <ChatArea
        channel={selectedChannel}
        messages={messages}
        currentUser={currentUser}
        onSendMessage={onSendMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        typingUsers={typingUsers}
      />
      <MemberList members={members} />
    </div>
  );
}
