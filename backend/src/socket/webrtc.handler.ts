import { Server as SocketIOServer, Socket } from 'socket.io';

interface RTCSessionDesc { type: string; sdp?: string }
interface RTCIceCandidateData { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }

export function setupWebRTCHandlers(io: SocketIOServer, socket: Socket, userId: string) {
  socket.on('voice:join', (data: { channelId: string }) => {
    socket.join(`voice:${data.channelId}`);
    socket.to(`voice:${data.channelId}`).emit('voice:user-joined', { userId });
  });

  socket.on('voice:leave', (data: { channelId: string }) => {
    socket.leave(`voice:${data.channelId}`);
    socket.to(`voice:${data.channelId}`).emit('voice:user-left', { userId });
  });

  socket.on('voice:offer', (data: { targetUserId: string; offer: RTCSessionDesc }) => {
    io.to(`user:${data.targetUserId}`).emit('voice:offer', { fromUserId: userId, offer: data.offer });
  });

  socket.on('voice:answer', (data: { targetUserId: string; answer: RTCSessionDesc }) => {
    io.to(`user:${data.targetUserId}`).emit('voice:answer', { fromUserId: userId, answer: data.answer });
  });

  socket.on('voice:ice-candidate', (data: { targetUserId: string; candidate: RTCIceCandidateData }) => {
    io.to(`user:${data.targetUserId}`).emit('voice:ice-candidate', { fromUserId: userId, candidate: data.candidate });
  });
}
