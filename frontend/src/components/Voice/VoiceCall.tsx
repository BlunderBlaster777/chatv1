import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { Channel, User } from '../../types';

interface VoiceCallProps {
  channel: Channel;
  currentUser: User;
}

export default function VoiceCall({ channel, currentUser }: VoiceCallProps) {
  const { socket } = useSocket();
  const [inCall, setInCall] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('voice:ice-candidate', { targetUserId, candidate: e.candidate });
      }
    };
    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('voice:user-joined', async ({ userId }: { userId: string }) => {
      setParticipants(prev => [...prev, userId]);
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice:offer', { targetUserId: userId, offer });
    });
    socket.on('voice:user-left', ({ userId }: { userId: string }) => {
      setParticipants(prev => prev.filter(id => id !== userId));
      peerConnectionsRef.current.get(userId)?.close();
      peerConnectionsRef.current.delete(userId);
    });
    socket.on('voice:offer', async ({ fromUserId, offer }: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { targetUserId: fromUserId, answer });
    });
    socket.on('voice:answer', async ({ fromUserId, answer }: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      await peerConnectionsRef.current.get(fromUserId)?.setRemoteDescription(answer);
    });
    socket.on('voice:ice-candidate', async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      await peerConnectionsRef.current.get(fromUserId)?.addIceCandidate(candidate);
    });
    return () => {
      socket.off('voice:user-joined');
      socket.off('voice:user-left');
      socket.off('voice:offer');
      socket.off('voice:answer');
      socket.off('voice:ice-candidate');
    };
  }, [socket, inCall]);

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      socket?.emit('voice:join', { channelId: channel.id });
      setInCall(true);
      setParticipants([currentUser.id]);
    } catch {
      alert('Could not access microphone');
    }
  };

  const leaveCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    socket?.emit('voice:leave', { channelId: channel.id });
    setInCall(false);
    setParticipants([]);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
      setMuted(!muted);
    }
  };

  return (
    <div style={{
      background: '#2f3136', padding: '12px 16px', borderBottom: '1px solid #202225',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#b9bbbe', fontSize: '13px' }}>🔊 {channel.name}</span>
        {!inCall ? (
          <button onClick={joinCall} style={joinBtnStyle}>Join Voice</button>
        ) : (
          <>
            <button onClick={toggleMute} style={{
              ...joinBtnStyle,
              background: muted ? '#f04747' : '#43b581',
            }}>
              {muted ? '🔇 Unmute' : '🎙️ Mute'}
            </button>
            <button onClick={leaveCall} style={{ ...joinBtnStyle, background: '#f04747' }}>
              Disconnect
            </button>
            <span style={{ color: '#43b581', fontSize: '12px' }}>
              {participants.length} in call
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const joinBtnStyle: React.CSSProperties = {
  background: '#43b581', border: 'none', borderRadius: '4px',
  color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: '13px', fontWeight: 600,
};
