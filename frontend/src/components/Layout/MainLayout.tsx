import { useState } from 'react';
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
  onOpenDMs: () => void;
  onOpenSettings: () => void;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onChannelsChanged: () => void;
  onMembersChanged: () => void;
}

export default function MainLayout({
  servers, selectedServer, channels, selectedChannel, messages,
  members, currentUser, typingUsers,
  onSelectServer, onSelectChannel, onCreateServer,
  onSendMessage, onEditMessage, onDeleteMessage, onLogout,
  onOpenDMs, onOpenSettings, currentUserRole, onChannelsChanged, onMembersChanged,
}: MainLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const handleSelectChannel = (id: string) => {
    onSelectChannel(id);
    setLeftOpen(false); // auto-close drawer after channel pick on mobile
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d14] relative text-slate-100">

      {/* ── Backdrop (mobile only) ─────────────────────────────── */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={closeAll}
        />
      )}

      {/* ── Left drawer: ServerSidebar + ChannelSidebar ──────────
          Mobile: fixed overlay, slides in/out
          Desktop: normal flex item, always visible               */}
      <div className={[
        'fixed inset-y-0 left-0 z-40 flex flex-row',
        'lg:relative lg:inset-auto lg:z-auto lg:flex lg:translate-x-0',
        'transition-transform duration-300 ease-in-out',
        leftOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        <ServerSidebar
          servers={servers}
          selectedServerId={selectedServer?.id || null}
          onSelectServer={id => { onSelectServer(id); setLeftOpen(false); }}
          onCreateServer={onCreateServer}
          currentUser={currentUser}
          onOpenDMs={onOpenDMs}
        />
        <ChannelSidebar
          server={selectedServer}
          channels={channels}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={handleSelectChannel}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          onChannelsChanged={onChannelsChanged}
          onMembersChanged={onMembersChanged}
        />
      </div>

      {/* ── Chat area (always full width on mobile) ───────────── */}
      <ChatArea
        channel={selectedChannel}
        messages={messages}
        currentUser={currentUser}
        onSendMessage={onSendMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        typingUsers={typingUsers}
        onMenuOpen={() => { setRightOpen(false); setLeftOpen(true); }}
        onMembersOpen={() => { setLeftOpen(false); setRightOpen(true); }}
      />

      {/* ── Right drawer: MemberList ──────────────────────────────
          Mobile: fixed overlay, slides in from right
          Desktop: normal flex item, always visible               */}
      <div className={[
        'fixed inset-y-0 right-0 z-40',
        'lg:relative lg:inset-auto lg:z-auto lg:translate-x-0',
        'transition-transform duration-300 ease-in-out',
        rightOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      ].join(' ')}>
        <MemberList members={members} />
      </div>

    </div>
  );
}
