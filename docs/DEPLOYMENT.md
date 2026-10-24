# Deployment Guide

## Neon PostgreSQL Setup
1. Create a free PostgreSQL instance on [Neon](https://neon.tech).
2. Copy the pooled connection string with `sslmode=require`.
3. Set `DATABASE_URL` in your deployment environment variables.

## Vercel Deployment
1. Connect the repository to Vercel and set the project Root Directory to the repository root (`.`).
2. Set the Framework Preset to **Services**. The root `vercel.json` builds `apps/web` and `apps/api` as separate services and sends `/api/*` requests to the API service. Do not set the project root to `apps/web` or use the **Vite** preset for this combined deployment: the web-only SPA fallback serves `index.html` for API requests, causing sign-in requests to fail with HTTP 405.
3. Configure the following environment variables on the Vercel project:
   - `DATABASE_URL`: Connection string from Neon.
   - `JWT_SECRET`: Random 32+ character string.
   - `NODE_ENV`: `production`
   - `PLATFORM_ADMIN_PASSWORD`: Strong password for the platform admin account.
4. Run migrations against the remote Neon database:
   ```bash
   DATABASE_URL="<your_neon_url>" pnpm --filter @appointmo/api db:migrate
   DATABASE_URL="<your_neon_url>" pnpm --filter @appointmo/api db:seed
   ```
5. Deploy and verify `/api/health` returns JSON with `"status":"healthy"` (not the website's `index.html`), then verify the landing page.

If deploying the frontend and API as separate Vercel projects instead, deploy `apps/api` separately and set `VITE_API_URL` on the frontend project to the API origin plus `/api` (for example, `https://your-api.example.com/api`). The frontend's default `/api` base is intended for the combined Services deployment above.
