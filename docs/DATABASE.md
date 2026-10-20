# Appointmo Database Documentation

## Relational Schema
The database uses normalized PostgreSQL tables:
- `businesses`: Holds tenant configuration (Lumière Beauty Studio, currency, timezone).
- `branches`: Physical locations (Quezon City).
- `users`: Authenticated platform admins and salon staff.
- `services`: Offerings with duration and base pricing.
- `staff_profiles`: Salon aestheticians and wellness specialists.
- `staff_services`: Join table linking staff qualifications to services.
- `staff_working_hours`: Weekly schedule with shifts and break intervals.
- `staff_time_off`: Blackout periods and leaves.
- `customers`: Guest or returning customer contact records.
- `appointments`: Booking records with historical price snapshots and management token hashes.
- `appointment_status_history`: Audit log of status transitions.
- `demo_access_requests`: Inquiries submitted from the public landing page.
- `demo_invitations`: Secure single-use invitation tokens with expiration.
- `audit_logs`: Administrative actions log.

## Migrations & Deterministic Seeding
- Run migrations: `pnpm --filter @appointmo/api db:migrate`
- Run deterministic seed: `pnpm --filter @appointmo/api db:seed`
  - Populates 1 business, 1 branch, 6 services, 3 staff, 40 customers, and 125 historical, upcoming, and cancelled appointments.
