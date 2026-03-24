export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string | null;
  statusMessage?: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'DND';
  createdAt?: string;
}

export interface Server {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  ownerId: string;
  inviteCode?: string;
  createdAt?: string;
  channels?: Channel[];
  _count?: { members: number };
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  editedAt?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatar?: string | null };
  reactions: Reaction[];
  files: FileRecord[];
}

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user?: { id: string; username: string };
}

export interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: { id: string; username: string; avatar?: string | null; status: string; statusMessage?: string | null };
}

export interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  editedAt?: string | null;
  createdAt: string;
  sender: { id: string; username: string; avatar?: string | null };
}
