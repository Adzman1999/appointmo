# Testing and Verification

The workspace has shared schema tests, API integration tests, and a small web test suite. API coverage includes account access, booking, concurrency, availability, discovery, and appointment workflows. API tests seed their own database fixtures through `apps/api/test/support/seedTestDatabase.ts`.

For the complete local check, set `TEST_DATABASE_URL` in `apps/api/.env` to a local PostgreSQL database with a name ending in `_test`, create it once, and run:

```sh
createdb appointmo_test
pnpm verify
```

The verification script runs workspace typechecks, applies migrations to the test database, runs all workspace test suites, and builds the applications. It overrides `DATABASE_URL` for each child process and refuses remote databases or database names without the `_test` suffix.

Individual commands are available when diagnosing a step:

```sh
pnpm typecheck
pnpm db:migrate
pnpm --filter @appointmo/shared test
pnpm --filter @appointmo/api test
pnpm build
```

The GitHub Actions workflow runs typechecks, shared and API tests, then builds the web and API packages. It does not currently run the web test suite or a lint command.
