# BlockChat

BlockChat is a Discord-style chat app with servers, channels, DMs, role-based permissions, voice channels, and an Electron wrapper.

This repository now supports a Cloudflare-first deployment model:

| Surface | Runtime | Status |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Ready |
| API | Cloudflare Workers | Ready |
| Database | Neon PostgreSQL | Ready |
| Local dev backend | Express + Socket.IO | Preserved |

## What changed

The project used to assume this split:

- frontend on Cloudflare Pages
- backend on Railway

It now ships with a dedicated Worker entrypoint in backend/src/worker.ts and Wrangler config in backend/wrangler.jsonc, so you can deploy the API directly to Cloudflare Workers while keeping the original Express server for local development.

Because the old production backend depended on Node HTTP sockets and local disk storage, the Cloudflare deployment currently runs in a Cloudflare-safe mode:

- authentication works
- servers, channels, members, messages, and DMs work
- the frontend automatically falls back to REST polling when realtime is disabled
- voice channels are shown but disabled in Cloudflare deployment
- file uploads are disabled in Cloudflare deployment until you add object storage such as R2

That means the app is deployable to Cloudflare today without pretending Socket.IO-on-Workers is already solved.

## Repository layout

```text
chatv1/
├── backend/      Express local dev server + Cloudflare Worker entrypoint
├── frontend/     React + Vite app for Cloudflare Pages
├── desktop/      Electron shell for local/desktop use
└── README.md
```

## Deployment modes

### Local development mode

Use this if you want the full original feature set, including Socket.IO, typing indicators, and voice signaling.

- backend runs with Express on port 3001
- frontend runs with Vite on port 5173
- Vite proxies API and Socket.IO traffic to the backend
- uploads are stored in backend/uploads

### Cloudflare deployment mode

Use this for Pages + Workers + Neon.

- frontend deploys as a static Vite build on Pages
- backend deploys as a Worker using backend/src/worker.ts
- API calls go directly to the Worker URL
- UI uses polling instead of Socket.IO by default
- voice and file uploads are explicitly disabled

## Prerequisites

- Node.js 20+
- npm 10+
- a Neon PostgreSQL database
- a Cloudflare account
- Wrangler authenticated with your Cloudflare account

Log in once before deploying:

```bash
npx wrangler login
```

## Local development setup

### 1. Install dependencies

```bash
cd chatv1/backend
npm install

cd ../frontend
npm install

cd ../desktop
npm install
```

### 2. Configure Neon

Create your Neon project if you have not already, then copy:

- pooled connection string into DATABASE_URL
- direct connection string into DIRECT_DATABASE_URL

### 3. Configure backend env

Copy backend/.env.example to backend/.env and set at least:

```env
DATABASE_URL=...
DIRECT_DATABASE_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=http://localhost:5173
APP_MODE=local
```

### 4. Run Prisma setup

```bash
cd chatv1/backend
npm run db:generate
npm run db:migrate
```

### 5. Start the local backend

```bash
cd chatv1/backend
npm run dev
```

The Express backend is available at http://localhost:3001.

### 6. Configure frontend env

Copy frontend/.env.example to frontend/.env.

For local development you can leave VITE_API_URL empty and keep realtime enabled:

```env
VITE_API_URL=
VITE_REALTIME_ENABLED=true
VITE_FILE_UPLOADS_ENABLED=true
VITE_POLL_INTERVAL_MS=5000
```

### 7. Start the frontend

```bash
cd chatv1/frontend
npm run dev
```

The frontend is available at http://localhost:5173.

### 8. Start Electron if needed

```bash
cd chatv1/desktop
npm run dev
```

## Cloudflare deployment

## Overview

Production now looks like this:

```text
Browser
  -> Cloudflare Pages (frontend)
  -> Cloudflare Worker (API)
  -> Neon PostgreSQL
```

The Worker does not use DIRECT_DATABASE_URL at runtime. You still need DIRECT_DATABASE_URL anywhere you run Prisma migrations.

## Step 1. Run production migrations

Run migrations from your machine or CI before the first deploy and whenever the schema changes.

```bash
cd chatv1/backend
npm run db:migrate:deploy
```

Use production credentials when you run that command:

```env
DATABASE_URL=your-neon-pooled-url
DIRECT_DATABASE_URL=your-neon-direct-url
```

## Step 2. Configure the Worker

Install backend dependencies if you have not already:

```bash
cd chatv1/backend
npm install
```

Set Worker secrets:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
```

Set the frontend origin as a Worker variable.

In backend/wrangler.jsonc, update FRONTEND_URL to your real Pages hostname after you know it, or set it in Cloudflare dashboard per environment.

Default Worker vars in this repo:

```json
{
  "APP_MODE": "cloudflare",
  "FRONTEND_URL": "https://your-project.pages.dev"
}
```

### Optional local Worker dev

If you want to run the Worker locally instead of the Express server, copy backend/.dev.vars.example to backend/.dev.vars and fill it in, then run:

```bash
cd chatv1/backend
npm run dev:worker
```

### Deploy the Worker

```bash
cd chatv1/backend
npm run deploy:worker
```

### Validate the Worker build without deploying

```bash
cd chatv1/backend
npm run check:worker
```

## Step 3. Configure Cloudflare Pages

Install frontend dependencies if you have not already:

```bash
cd chatv1/frontend
npm install
```

The frontend already includes frontend/wrangler.jsonc and a Pages deploy script.

Set these environment variables in Pages:

| Variable | Value |
| --- | --- |
| VITE_API_URL | your Worker URL, for example https://blockchat-api.your-subdomain.workers.dev |
| VITE_REALTIME_ENABLED | false |
| VITE_FILE_UPLOADS_ENABLED | false |
| VITE_POLL_INTERVAL_MS | 5000 |

### Deploy with Wrangler

```bash
cd chatv1/frontend
npm run build
npm run deploy:pages -- --project-name blockchat
```

### Or deploy from the Cloudflare dashboard

Use these settings:

- framework preset: Vite
- root directory: chatv1/frontend
- build command: npm run build
- build output directory: dist

Then add the same Pages environment variables listed above.

## Step 4. Update Worker CORS origin

After Pages gives you the final hostname, update FRONTEND_URL for the Worker so CORS matches your deployed frontend.

If you use a custom domain, set FRONTEND_URL to that custom domain instead.

## Step 5. Smoke test production

After both services are live:

1. register a new user
2. create a server
3. create or view a text channel
4. send a message
5. open DMs and send a DM
6. edit or delete a message to confirm the REST paths work

## Environment reference

### Backend local env

backend/.env.example contains the local Express settings.

| Variable | Required locally | Used by Worker runtime | Notes |
| --- | --- | --- | --- |
| DATABASE_URL | Yes | Yes | Neon pooled connection |
| DIRECT_DATABASE_URL | Yes | No | Only needed for Prisma migrations |
| JWT_SECRET | Yes | Yes | Access token signing secret |
| JWT_REFRESH_SECRET | Yes | Yes | Refresh token secret |
| FRONTEND_URL | Yes | Yes | CORS origin |
| PORT | Yes for Express | No | Express only |
| APP_MODE | Recommended | Yes | local or cloudflare |
| UPLOAD_DIR | Optional | No | Express only |
| MAX_FILE_SIZE | Optional | No | Express only |

### Frontend env

frontend/.env.example contains the production-safe defaults.

| Variable | Recommended on Pages | Purpose |
| --- | --- | --- |
| VITE_API_URL | Yes | Worker origin without trailing slash |
| VITE_REALTIME_ENABLED | Yes | false on Cloudflare deployment |
| VITE_FILE_UPLOADS_ENABLED | Yes | false until R2 or equivalent is added |
| VITE_POLL_INTERVAL_MS | Yes | polling interval for message and DM refresh |

## Current Cloudflare feature support

| Feature | Local Express mode | Cloudflare mode |
| --- | --- | --- |
| Register / login / refresh | Yes | Yes |
| Server and member management | Yes | Yes |
| Channel list and permissions | Yes | Yes |
| Channel messages | Yes | Yes |
| Direct messages | Yes | Yes |
| Real-time Socket.IO events | Yes | No |
| Typing indicators | Yes | No |
| Presence updates | Yes | No |
| Voice signaling | Yes | No |
| Local-disk file uploads | Yes | No |

## Files added for Cloudflare deployment

- backend/src/worker.ts: Worker API entrypoint
- backend/wrangler.jsonc: Worker config
- backend/.dev.vars.example: local Worker secrets template
- frontend/wrangler.jsonc: Pages config
- frontend/src/config/runtime.ts: runtime capability flags

## Recommended next improvements

If you want Cloudflare parity with the original Railway-era feature set, these are the next pieces to add:

1. Durable Objects for realtime rooms, presence, and voice signaling.
2. R2 for file uploads and attachment delivery.
3. A shared data-access layer so the Express and Worker backends do not duplicate route logic.

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
