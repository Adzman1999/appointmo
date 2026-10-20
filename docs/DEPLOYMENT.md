# Deployment Guide

## Neon PostgreSQL Setup
1. Create a free PostgreSQL instance on [Neon](https://neon.tech).
2. Copy the pooled connection string with `sslmode=require`.
3. Set `DATABASE_URL` in your deployment environment variables.

## Vercel Deployment
1. Connect your repository to Vercel.
2. Set Framework Preset to **Vite**.
3. Configure the following environment variables on Vercel:
   - `DATABASE_URL`: Connection string from Neon.
   - `JWT_SECRET`: Random 32+ character string.
   - `NODE_ENV`: `production`
   - `PLATFORM_ADMIN_PASSWORD`: Strong password for the platform admin account.
4. Run migrations against the remote Neon database:
   ```bash
   DATABASE_URL="<your_neon_url>" pnpm --filter @appointmo/api db:migrate
   DATABASE_URL="<your_neon_url>" pnpm --filter @appointmo/api db:seed
   ```
5. Deploy and verify `/api/health` and the landing page.
