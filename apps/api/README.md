# Appointmo API

## Database

The API uses ordered SQL migrations in `src/db/migrations`. Run them locally with:

```sh
pnpm --filter @appointmo/api db:migrate
```

Migration files are immutable after they have been applied. Add a new numbered SQL file for future schema changes. The initial migration is intentionally idempotent so an existing database can be brought under migration tracking without dropping its tables or records.

The local development server also applies pending migrations during startup. For deployed databases, run the migration command as a release step before routing traffic to the new API version.

## Local seed accounts

The seed reads the process environment and creates local-only accounts. In development, copy the repository-root `.env.example` to `.env` for database and API settings. For verification, copy `apps/api/.env.example` to `apps/api/.env`; `pnpm verify` reads `TEST_DATABASE_URL` from that file.

To override the local seed credentials, set the `SEED_*` variables, then run:

```sh
pnpm --filter @appointmo/api db:seed
```

The local seed creates one account for each requested role and an associated store, branch, and customer profile. In the application’s existing authorization model, **Super Admin** uses `platform_admin`, **Store Admin** uses `business_admin`, and **Customer** uses `customer`.

Default local credentials:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@appointmo.local` | `SuperAdmin2026!` |
| Store Admin | `storeadmin@appointmo.local` | `StoreAdmin2026!` |
| Customer | `customer@appointmo.local` | `Customer2026!` |

The seed is idempotent, refuses to run when `NODE_ENV=production`, and preserves existing appointments and customer records. Do not use the local seed to provision production accounts.

## Combined local verification

The root `pnpm verify` command runs all workspace typechecks, applies migrations to a separate test database, runs all test suites, and builds the app. It refuses to run unless `TEST_DATABASE_URL` points to localhost and the database name ends in `_test`.

Create the local test database once if it does not exist:

```sh
createdb appointmo_test
```

Set `TEST_DATABASE_URL` in `apps/api/.env`, then run from the repository root:

```sh
pnpm verify
```

The verification command sets `NODE_ENV=test` and overrides `DATABASE_URL` for each child process, so the API tests use the test database rather than `appointment_dev`.
