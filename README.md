# Appointmo — Intelligent Appointment Platform

> "The smarter way to book."

Appointmo is a full-stack, realistic appointment-booking SaaS portfolio project featuring frictionless guest booking, genuine real-time schedule calculation, transactional double-booking protection, an explainable natural-language concierge engine, contact-first protected demo access, and an administrative salon dashboard.

Initial showcase tenant: **Lumière Beauty Studio** (Quezon City, Philippines).

---

## Key Differentiators

1. **Quick Booking**: Guests can discover services and book in seconds without compulsory account registration.
2. **Concierge Booking**: Natural-language inquiries (e.g., *"I want a facial tomorrow afternoon under ₱1,500"*) analyzed and matched to genuine database availability with explainable criteria.
3. **Real Availability**: Open slots calculated live against staff working shifts, lunch breaks, service durations, and booked intervals.
4. **Concurrency & Double-Booking Protection**: Transactional row-level locking (`FOR UPDATE`) guarantees zero slot overlaps during concurrent booking attempts.
5. **Contact-First Private Demo Access**: Visitors submit demo requests. Access is granted only when approved by the product owner via single-use, cryptographically hashed invitation tokens.
6. **Guest Appointment Management**: Private lookup and cancellation via booking reference and secret management tokens, eliminating ID enumeration vulnerabilities.
7. **Business Dashboard**: Real-time metrics, appointment search & status changes, and deterministic demo dataset reset.

---

## Tech Stack

- **Monorepo**: pnpm workspaces (`packages/shared`, `apps/api`, `apps/web`)
- **Frontend**: React 18, TypeScript (strict mode), Vite, Tailwind CSS, TanStack Query, React Router, Lucide icons
- **Backend**: Node.js, Express, TypeScript, Zod, bcryptjs, jsonwebtoken, pg (node-postgres)
- **Database**: PostgreSQL 18 (Local dev & test, Neon compatible)
- **Testing**: Vitest, Supertest, PostgreSQL integration tests
- **CI/CD & Deployment**: GitHub Actions, Vercel (SPA + serverless API), Neon PostgreSQL

---

## Getting Started

### Prerequisites
- Node.js `v20+` or `v24+`
- `pnpm` (`v10+`)
- Local PostgreSQL instance

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL database.

### 3. Run Migrations & Deterministic Seed
```bash
# Apply schema tables and indexes
pnpm db:migrate

# Seed Lumière Beauty Studio demo data (125 realistic appointments)
pnpm db:seed
```

### 4. Start Development Servers
```bash
# Run both API (port 4000) and Web (port 5173) in parallel
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Credentials & Access

- **Public Landing Page**: [http://localhost:5173](http://localhost:5173)
- **Platform Owner Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
  - Email: `admin@appointmo.demo`
  - Password: `AppointmoAdmin2026!`
- **Salon Owner Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
  - Email: `owner@lumiere.demo`
  - Password: `Lumiere2026!`
- **Invitation Redemption**: [http://localhost:5173/demo/redeem](http://localhost:5173/demo/redeem)

---

## Automated Testing & Verification

```bash
# Run shared package unit tests
pnpm --filter @appointmo/shared test

# Run backend integration & concurrency tests
pnpm --filter @appointmo/api test

# Typecheck all packages
pnpm typecheck

# Production builds
pnpm --filter @appointmo/api build
pnpm --filter @appointmo/web build
```

---

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Database & Migrations](docs/DATABASE.md)
- [Demo Access & Gatekeeping](docs/DEMO-ACCESS.md)
- [Testing Strategy](docs/TESTING.md)
- [Deployment to Vercel & Neon](docs/DEPLOYMENT.md)
- [CI/CD Pipeline](docs/CI-CD.md)
