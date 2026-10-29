# Appointmo

Appointmo is an appointment booking platform for service businesses. Customers can browse services, see staff availability, book appointments, and manage their bookings. Store teams manage services, staff schedules, customers, and appointments from a central dashboard.

The initial local store is **Lumière Beauty Studio** in Quezon City, Philippines.

## Current app

- Live availability calculated from store hours, staff shifts, breaks, service duration, and existing appointments.
- Transactional booking protection to prevent overlapping appointments.
- Customer accounts and secure appointment management.
- Business discovery, branch locations, service booking, and booking suggestions with explainable service and staff matches.
- Store dashboard for appointments, service catalog, staff schedules, customer records, payroll, reviews, and operational status.
- Platform access requests, administrator review, and revocable invitation sessions.

Main screens are `/` (business setup), `/discover` (business directory), `/book` (booking), `/concierge` (booking suggestions), `/customer/portal` (customer appointments), `/admin/dashboard` (store operations), `/owner/access-requests` (platform access review), and `/superadmin` (store and customer approvals). Sign in at `/admin/login`.

## Tech stack

- pnpm workspaces: `packages/shared`, `apps/api`, `apps/web`
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router
- API: Node.js, Express, TypeScript, Zod, PostgreSQL
- Tests: Vitest, Supertest, and PostgreSQL integration tests

## Local setup

Requirements: Node.js 20 or newer, pnpm 10+, and PostgreSQL.

```sh
pnpm install
cp .env.example .env
```

Edit `.env` and set your local PostgreSQL username and a private JWT secret. Then prepare the database and local accounts:

```sh
createdb appointment_dev
pnpm db:migrate
pnpm db:seed
```

Start the API and web app together:

```sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## Local accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@appointmo.local` | `SuperAdmin2026!` |
| Store Admin | `storeadmin@appointmo.local` | `StoreAdmin2026!` |
| Customer | `customer@appointmo.local` | `Customer2026!` |

These accounts are for local development only. The seed command refuses to run in production and preserves existing appointments and customer records.

## Verify the workspace

Copy `apps/api/.env.example` to `apps/api/.env` if needed, then set `TEST_DATABASE_URL` there to a local database whose name ends in `_test`. Create the database once, then run:

```sh
createdb appointmo_test
pnpm verify
```

`pnpm verify` runs workspace typechecks, applies migrations to the test database, runs all workspace test suites, and builds the applications. It refuses remote or non-test database URLs.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database and migrations](docs/DATABASE.md)
- [Access requests](docs/ACCESS-REQUESTS.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [CI/CD](docs/CI-CD.md)
- [API setup and local accounts](apps/api/README.md)
