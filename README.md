# Mini-Discord

A lightweight, Discord-like chat app built entirely on the Cloudflare free tier. Supports public channels, direct messages, and group chats with real-time messaging, persistent history, and a responsive dark-mode UI that works on Mac, Windows, and iPad.

## Features

- **Accounts** — register/login with secure PBKDF2-hashed passwords (Web Crypto API, no external deps)
- **Public channels** — create and browse `#general`-style channels
- **Direct messages** — private 1-on-1 conversations
- **Group chats** — invite multiple friends into a named private chat
- **Real-time messaging** — WebSockets via Cloudflare Durable Objects, one DO instance per channel
- **Message history** — persisted to Cloudflare D1 with infinite scroll (loads older messages as you scroll up)
- **File attachments** — upload images and files (stored in Cloudflare R2, max 8 MB)
- **Typing indicators** — see when someone is typing
- **Online presence** — green/grey dot per member in the sidebar
- **Auto-reconnect** — WebSocket drops silently reconnect with exponential backoff
- **PWA** — installable on iPad and Mac home screens via `manifest.json` + service worker
- **Responsive** — 3-column layout on desktop, hamburger sidebar on mobile/tablet

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Workers + Hono.js |
| Real-time | Cloudflare Durable Objects (SQLite, WebSocket Hibernation) |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Auth | JWT + PBKDF2 via Web Crypto API |

## Free Tier Usage

| Resource | Free Limit | How we use it |
|---|---|---|
| Worker Requests | 100k/day | API calls |
| D1 Reads | 5M/day | Message history (paginated) |
| D1 Writes | 100k/day | New messages |
| R2 Storage | 10 GB | File attachments |
| DO Requests | 1M/month | WebSocket sessions |

## Project Structure

```
mini-discord/
├── worker/                         # Cloudflare Worker
│   ├── wrangler.toml               # Worker config (D1, R2, DO bindings)
│   ├── schema.sql                  # D1 schema + seed data
│   └── src/
│       ├── index.ts                # Hono app entry, routing, WS upgrade
│       ├── lib/
│       │   ├── auth.ts             # PBKDF2 hashing + JWT sign/verify
│       │   └── id.ts               # UUID generator
│       ├── routes/
│       │   ├── auth.ts             # POST /api/auth/register|login
│       │   ├── channels.ts         # GET/POST/DELETE /api/channels
│       │   ├── messages.ts         # GET /api/messages/:channelId
│       │   ├── upload.ts           # POST /api/upload
│       │   └── users.ts            # GET /api/users
│       └── durable-objects/
│           └── ChatRoom.ts         # Per-channel WebSocket hub + D1 writes
└── web/                            # Next.js frontend
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── chat/
    │   │   ├── layout.tsx          # 3-column shell + mobile hamburger
    │   │   └── [channelId]/page.tsx
    │   └── components/
    │       ├── Sidebar.tsx         # Channel list + DM list + user bar
    │       ├── ChatArea.tsx        # Messages, infinite scroll, WS logic
    │       ├── MessageInput.tsx    # Text input + file upload
    │       ├── MemberList.tsx      # Online/offline member panel
    │       ├── CreateChannelModal.tsx
    │       └── StartDMModal.tsx    # User picker for DMs and group chats
    └── public/
        ├── manifest.json           # PWA manifest
        └── sw.js                   # Service worker
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)

### 1. Clone and install

```bash
git clone https://github.com/BlunderBlaster777/chatv1.git
cd chatv1

cd worker && npm install
cd ../web && npm install
```

### 2. Create Cloudflare resources

```bash
cd worker

# Create D1 database — copy the database_id from the output
npx wrangler d1 create mini-discord-db

# Create R2 bucket
npx wrangler r2 bucket create mini-discord-uploads
```

Paste the `database_id` into `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mini-discord-db"
database_id = "PASTE_YOUR_ID_HERE"
```

### 3. Seed the database

```bash
# Local dev
npx wrangler d1 execute mini-discord-db --local --file=schema.sql

# Production
npx wrangler d1 execute mini-discord-db --file=schema.sql
```

### 4. Set your JWT secret

```bash
npx wrangler secret put JWT_SECRET
# Enter any random 32+ character string when prompted
```

### 5. Run locally

```bash
# Terminal 1 — worker
cd worker && npx wrangler dev --local

# Terminal 2 — frontend
cd web
cp .env.example .env.local   # sets NEXT_PUBLIC_API_URL=http://localhost:8787
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and start chatting.

### 6. Deploy to production

```bash
# Deploy worker
cd worker && npx wrangler deploy

# Update CORS_ORIGIN in wrangler.toml to your Pages URL, then redeploy

# Build and deploy frontend
cd web && npm run build
npx wrangler pages deploy out --project-name mini-discord
```

Update `NEXT_PUBLIC_API_URL` in your Cloudflare Pages environment variables to your worker URL.

## Database Schema

```sql
users          — id, username, password_hash, salt, avatar_url
channels       — id, name, description, type (public|dm|group), created_by
channel_members — channel_id, user_id  (used for dm + group access control)
messages       — id, channel_id, user_id, content, attachment_url, created_at
```

DM channels use a deterministic ID (`dm_<sorted_user_ids>`) so two users always share the same conversation regardless of who initiates it.

## Architecture Notes

**Real-time broadcasting** — each channel maps to a single Durable Object instance. All WebSocket connections for that channel connect to the same DO, so messages are fanned out instantly without polling D1.

**WebSocket auth** — browsers cannot set `Authorization` headers on WebSocket upgrades. The frontend passes the JWT as a subprotocol (`['bearer', token]`), and the worker reads it from the `Sec-WebSocket-Protocol` header before routing to the DO.

**Infinite scroll** — the messages API accepts a `?before=<unix_timestamp>` parameter. The frontend detects scroll-to-top, fetches the previous page, and prepends it while preserving scroll position.

**Auto-reconnect** — if the WebSocket closes unexpectedly (network drop, device sleep), the client retries with exponential backoff starting at 1 s, doubling each attempt up to a 30 s cap.
