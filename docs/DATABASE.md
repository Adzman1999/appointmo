# Database and Migrations

Appointmo uses PostgreSQL. The main tables cover:

- Businesses, branches, users, services, branch-service assignments, staff profiles, qualifications, and staff-branch assignments.
- Staff working hours, breaks, time off, compensation, and payroll records.
- Customers, appointments, appointment status history, reviews, and notifications.
- Access requests, invitations, password setup tokens, sessions, and administrative audit logs.

Appointments retain a price snapshot, booking reference, status, and a hash of the management token. Booking and staff schedules are stored against businesses and branches; the seed sets up Lumière Beauty Studio for local use.

## Migrations

Ordered SQL migrations live in `apps/api/src/db/migrations`. The migration runner records each filename and checksum in `schema_migrations`, uses a PostgreSQL advisory lock, and applies each migration transactionally. Applied migration files are immutable; add a new numbered file for schema changes.

```sh
pnpm db:migrate
```

Migration `002` renames the legacy `demo_*` access tables without dropping their records. `003` adds query indexes, `004` adds the access-guest role, and `005` adds store operational status. Migration files are checked against their stored SHA-256 checksum; edit only migrations that have not been applied anywhere, and otherwise add a new numbered migration.

## Local seed

```sh
pnpm db:seed
```

The seed creates the local super admin, store admin, customer, initial store, branch, and customer profile. It is idempotent, refuses to run with `NODE_ENV=production`, and preserves existing appointment and customer records. It does not load the full catalog or historical appointment fixture data used by API tests.
