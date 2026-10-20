# Testing Strategy & Execution

## Test Suites
1. **Unit Tests (`packages/shared/test/validation.test.ts`)**:
   - Zod schema input validation
   - Guest booking payload validation
   - Concierge inquiry validation

2. **Integration & API Tests (`apps/api/test/api.test.ts`)**:
   - Database migrations and deterministic seeding
   - Health check and public business & service listings
   - Demo access request submission, admin authorization, approval, and token redemption
   - Quick Booking creation and transactional double-booking prevention (`409 Conflict`)
   - Secure customer booking lookup and guest cancellation
   - Concierge recommendation engine scoring and explainability

## Running Tests Locally
```bash
# Run shared package tests
pnpm --filter @appointmo/shared test

# Run API integration tests
pnpm --filter @appointmo/api test

# Run all tests across workspace
pnpm test
```
