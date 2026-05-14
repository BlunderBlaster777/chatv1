# Cloudflare Deployment Guide

This repository is a monorepo. You do not deploy the whole repo as one Cloudflare app.

Deploy it as two separate Cloudflare projects:

1. Cloudflare Pages for the frontend in `chatv1/frontend`
2. Cloudflare Workers for the backend in `chatv1/backend`

The repo can stay connected as one GitHub repository, but each Cloudflare service must still target only one part of the monorepo.

This repo now includes repo-root helper commands so Cloudflare can build from the repo root and still only build the frontend or only build the backend.

## Important repo-root check

The repo-root commands only work if the connected GitHub repository root is the same directory that contains:

- `package.json`
- `wrangler.jsonc`
- `frontend/`
- `backend/`

In this project, that directory is `chatv1`.

If Cloudflare clones a parent directory above `chatv1`, then `npm run cf:frontend:build` will fail because Cloudflare will be looking for `/package.json` in the wrong place.

## Short answer

If you are deploying with the Cloudflare UI, you now have two valid options:

- option A: point Cloudflare at the subdirectory directly
- option B: keep the repo root as the project root and use the repo-root build commands added in `package.json`

If you want the safest setup for monorepos, use option B below.

## Repo-root build commands

These scripts were added at the repo root so Cloudflare can stay pointed at the repository root and still only build one app:

| Purpose | Command |
| --- | --- |
| Install frontend deps | `npm run cf:frontend:install` |
| Build frontend for Pages | `npm run cf:frontend:build` |
| Install backend deps | `npm run cf:backend:install` |
| Validate backend Worker build | `npm run cf:backend:check` |
| Deploy backend Worker from CLI | `npm run cf:backend:deploy` |

There is also a repo-root Worker config in `wrangler.jsonc` that points at `backend/src/worker.ts`.

That means Cloudflare can operate from the repo root without accidentally treating the frontend and backend as one combined app.

## Frontend with Pages UI from repo root

- connect the whole GitHub repo to Cloudflare Pages
- keep the Pages project at the repository root if you want
- use the repo-root build command instead of plain `npm run build`
- set the output directory to `frontend/dist`

If you prefer, you can still use `chatv1/frontend` as the Pages root directory. Both setups work.

## Backend with Workers UI from repo root

- connect the whole GitHub repo to Cloudflare Workers
- keep the repository root if needed
- use the repo-root `wrangler.jsonc`, which points to `backend/src/worker.ts`
- if the UI asks for a build command, use `npm run cf:backend:install`

This prevents the Worker project from trying to build the frontend.

## Old subdirectory-only method

If you prefer the original subdirectory approach, this still works:

- connect the whole GitHub repo to Cloudflare Pages
- set the Pages root directory to `chatv1/frontend`
- do not try to build from the repo root
- do not point Pages at `chatv1/backend`

## What gets deployed where

| Part | Cloudflare product | Root directory |
| --- | --- | --- |
| React frontend | Pages | `chatv1/frontend` |
| API backend | Workers | `chatv1/backend` |
| Database | Neon | external service |

## Before you deploy

Make sure you already ran the production migrations against Neon:

```bash
cd chatv1/backend
npm run db:migrate:deploy
```

That only needs to happen when your schema changes, but it should be done before first production use.

## Deploying the frontend with Cloudflare Pages UI

## 1. Open Pages

In Cloudflare dashboard:

1. Go to `Workers & Pages`
2. Click `Create`
3. Choose `Pages`
4. Choose `Connect to Git`

## 2. Connect the repository

Select the GitHub repository that contains this project.

Even though the frontend lives inside a monorepo, it is still correct to connect the full repo here. The important part is the Pages build configuration.

## 3. Use these build settings

### Recommended repo-root Pages settings

Set the Pages project to these values if Cloudflare is using the repo root:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` or `Vite` |
| Root directory | repository root |
| Build command | `npm run cf:frontend:build` |
| Build output directory | `frontend/dist` |

This is the monorepo-safe setup.

If this build fails with an error like `Could not read package.json: /opt/buildhome/repo/package.json`, then one of these is true:

1. the new repo-root `package.json` has not been committed and pushed yet
2. Cloudflare is connected to a parent repository and the real app root is `chatv1`

If your GitHub repository root is the parent folder, change the Pages `Root directory` to `chatv1` and keep:

- build command: `npm run cf:frontend:build`
- build output directory: `frontend/dist`

If your GitHub repository root is already `chatv1`, then keep the root directory at repository root and make sure the new root files are pushed.

### Alternative subdirectory Pages settings

Set the Pages project to these values if you point Cloudflare directly at the frontend folder:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Vite` |
| Root directory | `chatv1/frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Do not use repo-root builds with plain `npm run build`. Use `npm run cf:frontend:build` from the root, or use the frontend subdirectory with `npm run build`.

## 4. Add frontend environment variables

In the Pages project settings, add these environment variables for Production:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | your Worker URL, for example `https://blockchat-api.your-subdomain.workers.dev` |
| `VITE_REALTIME_ENABLED` | `false` |
| `VITE_FILE_UPLOADS_ENABLED` | `false` |
| `VITE_POLL_INTERVAL_MS` | `5000` |

These values match the Cloudflare-safe frontend mode already added to this repo.

## 5. Deploy

Click `Save and Deploy`.

After the first successful build, Cloudflare Pages will give you a URL like:

```text
https://your-pages-project.pages.dev
```

Keep that URL. You need it for the backend CORS setting.

## Backend note

The frontend alone is not enough. The React app needs the backend Worker URL in `VITE_API_URL`.

That means your backend must also be deployed separately as a Worker.

For the backend Worker, the equivalent monorepo rule is the same:

- connect the repo if you want
- either use the repo root with the root `wrangler.jsonc`
- or point the Worker project at `chatv1/backend`
- do not try to combine frontend and backend into one Cloudflare project

## Worker settings you will need

When you create the backend Worker in the UI, set:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `DATABASE_URL` | your Neon pooled connection string |
| Secret | `JWT_SECRET` | your generated JWT secret |
| Secret | `JWT_REFRESH_SECRET` | your generated refresh secret |
| Variable | `APP_MODE` | `cloudflare` |
| Variable | `FRONTEND_URL` | your Pages URL, for example `https://your-pages-project.pages.dev` |

`DIRECT_DATABASE_URL` is not needed by the Worker runtime. That is only for Prisma migrations, which you already ran locally.

## After Pages deploys

Once the frontend is live:

1. copy the Pages URL
2. update the backend Worker `FRONTEND_URL` variable to that exact URL
3. redeploy the Worker if Cloudflare does not do it automatically

This is required so CORS matches your deployed frontend.

## Should you deploy the whole repo?

No, not as one Cloudflare app.

Correct approach:

1. connect the whole GitHub repo to Cloudflare
2. create one Pages project for the frontend
3. create one Worker project for the backend
4. use repo-root commands or subdirectory roots so each project only builds its own files

Wrong approach:

1. create one Cloudflare project at repo root
2. use plain default build settings
3. expect it to build both frontend and backend automatically

Cloudflare does not treat this repo as a single combined deploy target.

What does work is using the repo root with separate project configs:

- Pages build command: `npm run cf:frontend:build`
- Pages output directory: `frontend/dist`
- Worker config: `wrangler.jsonc` at repo root pointing to `backend/src/worker.ts`
- Worker install command if needed: `npm run cf:backend:install`

## Troubleshooting: missing package.json in Cloudflare build logs

If you see this in Pages:

```text
npm error enoent Could not read package.json: /opt/buildhome/repo/package.json
```

use this decision rule:

### Case 1: your GitHub repo root is exactly `chatv1`

Use:

- Root directory: repository root
- Build command: `npm run cf:frontend:build`
- Build output directory: `frontend/dist`

And make sure these files are committed and pushed:

- `package.json`
- `wrangler.jsonc`

### Case 2: your GitHub repo root contains `chatv1/` as a subfolder

Use:

- Root directory: `chatv1`
- Build command: `npm run cf:frontend:build`
- Build output directory: `frontend/dist`

Do not use repository root in that case, because Cloudflare will be one directory too high.

## Recommended order

1. Deploy the backend Worker first
2. Copy the Worker URL
3. Create the Pages project for `chatv1/frontend`
4. Set `VITE_API_URL` to the Worker URL
5. Deploy Pages
6. Copy the final Pages URL
7. Set backend `FRONTEND_URL` to the Pages URL

## Smoke test after deploy

After both deploys are complete:

1. open the Pages URL
2. register a user
3. log in
4. create a server
5. open a text channel
6. send a message
7. open DMs and send a DM

## Current Cloudflare limitations in this repo

The current Cloudflare deployment in this repo supports:

- auth
- servers and members
- channels
- channel messages
- DMs

The current Cloudflare deployment does not yet support:

- Socket.IO realtime events
- voice signaling
- local-disk uploads

That is expected. The frontend is already configured to fall back to polling mode when deployed on Cloudflare.