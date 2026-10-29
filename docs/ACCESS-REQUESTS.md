# Platform Access and Account Approval

The repository has a platform access-request flow with two approval paths, plus a separate store-account approval flow. These paths use different routes and links.

## Invitation-based platform access

The API endpoints are mounted under `/api/access-requests`:

1. Submit a request with `POST /requests`.
2. A platform administrator lists, approves, or revokes requests with the protected `/requests` endpoints.
3. Approval creates a single-use invitation. PostgreSQL stores its SHA-256 hash and the invitation expires after seven days.
4. Redeem it with `POST /redeem`; the web app provides `/access/redeem`. Redemption returns a signed 24-hour session and stores its hash in `access_sessions`.
5. Revocation marks outstanding invitations and stored sessions as revoked. `GET /api/access/session` checks the stored session state.

The `/api/access` endpoints provide request submission, password setup, login, and session verification for the password-setup path. The currently routed owner screen at `/owner/access-requests` uses `/api/owner/requests` (also mounted at `/api/platform-admin/requests`); approving a platform access request sends a single-use password setup link that expires after 24 hours. Completing setup creates a seven-day signed session tied to the request, so the owner can revoke it.

Store-account approvals are separate: the super-admin screen at `/superadmin` uses `/api/owner/store-approvals` to review store registrations. The newer `/api/access-requests` invitation endpoints and `/access/redeem` screen remain available as the alternate platform access path described above.

## Local accounts

For local development, `pnpm db:seed` creates a platform administrator, store administrator, and customer account. The default credentials are listed in the root README and can be overridden with `SEED_*` environment variables. The seed is disabled when `NODE_ENV=production`.
