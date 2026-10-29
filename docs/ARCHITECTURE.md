# Appointmo Architecture

Appointmo is a TypeScript monorepo managed with pnpm:

- `packages/shared`: shared schemas, types, and domain models.
- `apps/api`: Express REST API and PostgreSQL access.
- `apps/web`: React single-page application built with Vite.

The API request flow is:

```text
Request → Router → Middleware → Controller → Service → Repository → PostgreSQL
```

The API is grouped by product area under `/api`: authentication and access, public business discovery, booking and availability, customer records, store administration, and platform administration. The compatibility prefix `/api/owner` points to the platform administration routes. The web app is a React SPA; its route definitions live in `apps/web/src/App.tsx`.

## Access and booking security

- Customer and store accounts use signed JWTs. Platform owner sign-in can use the configured owner credentials or a platform-admin account.
- Access requests are reviewed by a platform administrator. The invitation API stores token hashes and limits invitations to one use. Revocation marks session records inactive; `GET /api/access/session` verifies the stored session hash.
- Booking records retain hashed management tokens. Authenticated customer routes provide appointment management, notifications, and reviews.
- Appointment creation runs in a PostgreSQL transaction with conflict protection for overlapping staff schedules.

## Web app routes

- Public: `/`, `/discover` (also `/browse`), `/concierge`.
- Customer booking: `/book`, `/customer/portal` (also `/manage`).
- Store operations: `/admin/dashboard`.
- Account access: `/admin/login`, `/setup-password`, `/access/redeem`.
- Platform administration: `/owner/access-requests`, `/superadmin` (also `/admin/platform`).
