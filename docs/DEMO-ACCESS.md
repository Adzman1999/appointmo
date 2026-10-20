# Contact-First Demo Access System

## Lifecycle
1. **Public Request**: Visitors fill out the demo access form on the landing page (`fullName`, `email`, `businessName`, `message`, `privacyAcknowledgment`).
2. **Review & Approval**: The product owner logs into `/admin/login` using platform administrator credentials, visits `/admin/platform`, and reviews pending inquiries.
3. **Invitation Generation**: Upon clicking **Approve**, the server generates a cryptographically random invitation token (`inv_...`), stores a SHA-256 hash in `demo_invitations`, sets a 7-day expiration, and displays the redemption URL.
4. **Token Redemption**: The visitor enters the invitation token at `/demo/redeem`. The server verifies token status, marks it as redeemed, and issues a 24-hour signed JWT session (`role: demo_guest`).
5. **Access Revocation**: The administrator can revoke granted invitations at any time, terminating future redemptions and access.
