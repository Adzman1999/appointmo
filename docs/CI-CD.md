# CI/CD Pipeline Documentation

## GitHub Actions Workflow
The CI pipeline runs automatically on pull requests and pushes to `main`. It executes inside an isolated Ubuntu runner with a companion PostgreSQL 15 service container.

### Pipeline Stages
1. **Dependency Installation**: Uses `pnpm` with cache.
2. **Typecheck Workspace**: Runs `tsc --noEmit` across all workspace packages (`@appointmo/shared`, `@appointmo/api`, `@appointmo/web`).
3. **Unit Tests**: Runs Zod schema and logic tests in `@appointmo/shared`.
4. **Integration Tests**: Executes Supertest API suite against the test PostgreSQL instance, running real migrations, deterministic seeding, concurrency tests, and demo access flows.
5. **Production Build**: Compiles web assets via Vite and API TypeScript into `dist`.
