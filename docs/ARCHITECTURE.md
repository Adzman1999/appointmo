# Appointmo Architecture

## Overview
Appointmo is an intelligent appointment booking SaaS platform structured as a TypeScript monorepo using pnpm workspaces:
- `packages/shared`: Shared TypeScript types, Zod schemas, domain models.
- `apps/api`: REST API built with Node.js, Express, and PostgreSQL (`pg`). Supports both standalone server mode and Vercel serverless execution.
- `apps/web`: Single-Page Application (SPA) built with React 18, Vite, Tailwind CSS, TanStack Query, and Lucide icons.

```
Request → Router → Authentication/Authorization Middleware → Controller/Service → Repository → PostgreSQL
```

## Security & Access Control
1. **Contact-First Gatekeeping**: Visitors submit a demo access request. Access is granted only when the platform owner approves the request, generating a cryptographically secure, single-use invitation token.
2. **Session Verification**: The invitation token is redeemed for a signed JWT session (`role: demo_guest`), allowing entry into the interactive demo.
3. **Guest Booking Privacy**: Guest appointments are decoupled from mandatory account creation. Each booking receives a cryptographically random booking reference and secret management token hash, preventing predictable ID enumeration.
4. **Concurrency & Double-Booking Protection**: Bookings are performed inside PostgreSQL transactions using pessimistic row locking (`FOR UPDATE`) across overlapping time ranges.
