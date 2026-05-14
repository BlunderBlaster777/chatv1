# BlockChat

A full-featured real-time communication platform: servers, channels, direct messages, voice, and role-based permissions.

**Stack:** React · TypeScript · Vite · Tailwind CSS · Node.js · Express · Socket.IO · Prisma · Neon PostgreSQL · Electron

---

## Features

- JWT authentication with refresh tokens
- Real-time messaging via Socket.IO
- Servers with text and voice channels
- Role-based channel permissions (Owner / Admin / Member)
- Server management: add/remove members, create/delete channels
- Direct messages with bubble-style chat
- Typing indicators and presence (online/away/DND/offline)
- Message editing, deletion, and emoji reactions
- File uploads
- Voice channels with WebRTC
- Toast and desktop notifications
- Mobile-responsive layout with slide-in drawers
- Electron desktop app

---

## Architecture

```
chatv1/
├── backend/     # Express · Socket.IO · Prisma · Neon PostgreSQL
├── frontend/    # React · Vite · Tailwind CSS
└── desktop/     # Electron wrapper
```

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- A [Neon](https://neon.tech) account (free tier)

### 1. Clone and install

```bash
git clone <repo-url>
cd chatv1
```

### 2. Set up Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. In **Connection Details**, copy:
   - **Pooled connection** string → `DATABASE_URL`
   - **Direct connection** string → `DIRECT_DATABASE_URL`

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL, DIRECT_DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Backend runs on `http://localhost:3001`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. The Vite dev server proxies `/api` and `/socket.io` to the backend automatically — no extra config needed.

### 5. Desktop (optional)

```bash
cd desktop
npm install
npm run dev
```

---

## Deploying to Production

The deployment splits into two services:

| Service | Host | What runs there |
|---|---|---|
| Frontend | Cloudflare Pages | React/Vite static build |
| Backend | Railway | Express + Socket.IO + Prisma |
| Database | Neon | PostgreSQL (existing) |

### Step 1 — Deploy the backend to Railway

1. Create a free account at [railway.app](https://railway.app).

2. Click **New Project → Deploy from GitHub repo**, select this repository, and set the **Root Directory** to `chatv1/backend`.

3. Railway will detect `railway.toml` and build automatically.

4. In the Railway project, go to **Variables** and add:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Your Neon pooled connection string |
   | `DIRECT_DATABASE_URL` | Your Neon direct connection string |
   | `JWT_SECRET` | A long random string (use `openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | Another long random string |
   | `FRONTEND_URL` | `https://your-project.pages.dev` (set after step 2) |
   | `PORT` | `3001` |

5. Under **Settings → Networking**, enable **Public Networking**. Copy the generated URL — it looks like `https://chatv1-production-xxxx.railway.app`. You'll need it in the next step.

6. Run the database migration. In the Railway project shell (or locally with prod env vars):

   ```bash
   npx prisma migrate deploy
   ```

### Step 2 — Deploy the frontend to Cloudflare Pages

**Option A: Wrangler CLI (recommended)**

```bash
cd chatv1/frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name blockchat
```

On first run, Wrangler will prompt you to log in and create the project.

**Option B: Cloudflare Dashboard**

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**.
2. Connect your GitHub repo.
3. Set:
   - **Framework preset:** Vite
   - **Root directory:** `chatv1/frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Under **Environment variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://chatv1-production-xxxx.railway.app` |

5. Click **Save and Deploy**.

Your app will be live at `https://blockchat.pages.dev` (or whatever project name you chose).

### Step 3 — Update FRONTEND_URL on Railway

Once you have the Pages URL, go back to Railway and update `FRONTEND_URL` to match. This is needed for CORS. Railway will restart automatically.

### Step 4 — Verify

Open `https://blockchat.pages.dev`, register an account, create a server, and send a message. Check the Railway logs if anything fails.

---

## Adding a custom domain (optional)

**Cloudflare Pages:**
1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter your domain. Cloudflare will auto-configure the DNS record since you manage the domain there.

**Railway:**
1. In **Settings → Networking → Custom domain**, add your API subdomain (e.g. `api.yourdomain.com`).
2. Add a CNAME record in Cloudflare DNS pointing to the Railway-generated URL.
3. Update `FRONTEND_URL` on Railway and `VITE_API_URL` on Cloudflare Pages accordingly, then redeploy both.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Required in prod |
|---|---|---|
| `NODE_ENV` | Set to `production` | Yes |
| `DATABASE_URL` | Neon pooled connection string | Yes |
| `DIRECT_DATABASE_URL` | Neon direct connection string (migrations) | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `FRONTEND_URL` | Your Cloudflare Pages URL (for CORS) | Yes |
| `PORT` | Server port (Railway sets this automatically) | No |
| `UPLOAD_DIR` | File upload directory | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | No |

### Frontend (`frontend/.env`)

| Variable | Description | Required in prod |
|---|---|---|
| `VITE_API_URL` | Your Railway backend URL (no trailing slash) | Yes |

In development, leave `VITE_API_URL` empty — the Vite proxy handles routing.

---

## API Reference

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh tokens |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/me` | Current user profile |
| PUT | `/api/users/me` | Update profile |
| GET | `/api/users?q=` | Search users (for DMs / adding members) |
| GET | `/api/users/:id` | Get user by ID |

### Servers

| Method | Path | Description |
|---|---|---|
| GET | `/api/servers` | List your servers |
| POST | `/api/servers` | Create server |
| GET | `/api/servers/:id/channels` | List channels (filtered by your role) |
| POST | `/api/servers/:id/channels` | Create channel (admin+) |
| PATCH | `/api/servers/:id/channels/:channelId` | Update channel minRole (admin+) |
| DELETE | `/api/servers/:id/channels/:channelId` | Delete channel (admin+) |
| GET | `/api/servers/:id/members` | List members |
| POST | `/api/servers/:id/members` | Add member (admin+) |
| PATCH | `/api/servers/:id/members/:userId` | Change member role (owner only) |
| DELETE | `/api/servers/:id/members/:userId` | Remove member (admin+) |

### Channels & Messages

| Method | Path | Description |
|---|---|---|
| GET | `/api/channels/:id/messages` | Get messages |

### Direct Messages

| Method | Path | Description |
|---|---|---|
| GET | `/api/dms` | List DM conversations |
| GET | `/api/dms/:userId` | Get messages with a user |
| POST | `/api/dms/:userId` | Send a DM (REST fallback) |

### Files

| Method | Path | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload file |

---

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `channel:join` | Client→Server | Join channel room |
| `channel:leave` | Client→Server | Leave channel room |
| `chat:message` | Bidirectional | Send/receive channel message |
| `chat:edit` | Bidirectional | Edit message |
| `chat:delete` | Bidirectional | Delete message |
| `chat:reaction` | Bidirectional | Toggle emoji reaction |
| `typing:start/stop` | Bidirectional | Typing indicators |
| `dm:message` | Bidirectional | Send/receive direct message |
| `dm:typing:start/stop` | Bidirectional | DM typing indicators |
| `presence:update` | Bidirectional | Status changes |
| `voice:join/leave` | Client→Server | Voice channel |
| `voice:offer/answer/ice-candidate` | Bidirectional | WebRTC signaling |

---

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```
