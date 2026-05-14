'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatArea from '../../components/ChatArea';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Member { id: string; username: string }
interface Channel {
  id: string;
  name: string;
  type: string;
  members?: Member[];
}

function resolveDisplayName(channel: Channel, myId: string): string {
  if (channel.type === 'dm') {
    const other = channel.members?.find(m => m.id !== myId);
    return other?.username ?? 'Unknown';
  }
  return channel.name;
}

export default function ChannelPage({ params }: { params: { channelId: string } }) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const router = useRouter();

  const currentUser = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? 'null')
    : null;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${API}/api/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((channels: Channel[]) => {
        const found = channels.find(c => c.id === params.channelId);
        if (found) setChannel(found);
      });
  }, [params.channelId]);

  if (!channel) return (
    <div className="flex flex-1 items-center justify-center text-discord-muted">
      Loading…
    </div>
  );

  const displayName = resolveDisplayName(channel, currentUser?.id ?? '');

  return (
    <ChatArea
      channelId={channel.id}
      channelName={displayName}
      channelType={channel.type}
    />
  );
}
