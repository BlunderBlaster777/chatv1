# ChatV1 - Discord-like Communication App

A full-featured real-time communication platform built with Node.js, React, and Electron.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 💬 Real-time messaging with Socket.IO
- 🖥️ Servers, channels (text & voice), and direct messages
- 👥 Member lists with online/offline presence
- ✏️ Message editing, deletion, and emoji reactions
- 📁 File uploads
- 🎙️ Voice channels with WebRTC signaling
- 🔔 Toast and desktop notifications
- 🖥️ Electron desktop app with system tray

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Installation

### 1. Clone and Setup Environment

```bash
git clone <repo-url>
cd chatv1
cp .env.example .env
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials and secrets
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Desktop Setup (optional)

```bash
cd desktop
npm install
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `UPLOAD_DIR` | File upload directory | `uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` |

## Architecture

```
chatv1/
├── backend/          # Express + TypeScript + Socket.IO + Prisma
├── frontend/         # React + TypeScript + Vite
└── desktop/          # Electron wrapper
```

### Backend

- **Express** REST API with JWT authentication
- **Socket.IO** for real-time messaging, presence, typing indicators
- **Prisma ORM** with PostgreSQL
- **Multer** for file uploads
- WebRTC signaling server for voice calls

### Frontend

- **React** with TypeScript and Vite
- Discord-like UI (server list, channel list, chat area, member list)
- **Socket.IO client** for real-time updates
- **React Context** for state management
- Desktop Notifications API + toast notifications

### Desktop

- **Electron** wrapping the frontend
- System tray icon with context menu
- Desktop notifications via IPC
- App badge support (macOS)

## Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh tokens |
| GET | `/api/users/me` | Get current user |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/servers` | List user's servers |
| POST | `/api/servers` | Create server |
| POST | `/api/servers/:id/join` | Join server |
| GET | `/api/servers/:id/members` | Get members |
| GET | `/api/channels/:id/messages` | Get messages |
| POST | `/api/files/upload` | Upload file |

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `channel:join` | Client→Server | Join channel room |
| `chat:message` | Bidirectional | Send/receive message |
| `chat:edit` | Bidirectional | Edit message |
| `chat:delete` | Bidirectional | Delete message |
| `typing:start/stop` | Bidirectional | Typing indicators |
| `presence:update` | Bidirectional | Status updates |
| `voice:join/leave` | Client→Server | Voice channel |
| `voice:offer/answer/ice-candidate` | Bidirectional | WebRTC signaling |
