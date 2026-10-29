# CI Workflow

## GitHub Actions Workflow
The GitHub Actions workflow runs on pull requests targeting `main` and pushes to `main`. It executes on Ubuntu with a PostgreSQL 15 service container. This workflow validates and builds the repository; it does not deploy the app.

### Pipeline Stages
1. **Install dependencies** using pnpm with the pnpm store cache.
2. **Typecheck** all workspace packages.
3. **Run shared tests** for schemas and shared logic.
4. **Run API integration tests** against the PostgreSQL service, including test schema setup and account access, availability, and booking flows.
5. **Build** the web app and API package.

The workflow currently does not run lint or web tests. Local `pnpm verify` runs all workspace tests and builds after applying migrations to a guarded local `_test` database.
