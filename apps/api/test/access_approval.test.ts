import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool, query } from '../src/db';
import { runMigrations } from '../src/db/migrate';

const app = createApp();

beforeAll(async () => {
  // DB migrations are already invoked deterministically by test/api.test.ts; no concurrent DDL needed
});

afterAll(async () => {
  await pool.end();
});

describe('Appointmo Two-Sided Access Architecture (Owner & Approved Users)', () => {
  const testEmail = `invited.visitor.${Date.now()}@example.com`;
  const nonApprovedEmail = `unapproved.${Date.now()}@example.com`;
  let requestId: string;
  let ownerToken: string;
  let setupToken: string;
  let userDemoToken: string;

  // 1. Public visitors can open the landing page / public endpoints
  it('1. Public visitors can open public endpoints without credentials', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  // 2. Unapproved users cannot access the interactive demo
  it('2. Unapproved users cannot access the interactive demo session check', async () => {
    const res = await request(app).get('/api/access/session');
    expect(res.status).toBe(401);
  });

  // 3. Visitors can submit valid access requests
  it('3. Visitors can submit valid access requests', async () => {
    const res = await request(app)
      .post('/api/access/request')
      .send({
        fullName: 'Maya Lin',
        email: testEmail,
        businessName: 'Lin Studio',
        message: 'Requesting access to evaluate scheduling',
        acceptedPrivacy: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.message).toContain("We've received your request");
  });

  // 4. Invalid requests are rejected
  it('4. Invalid requests are rejected with validation errors', async () => {
    const res = await request(app)
      .post('/api/access/request')
      .send({
        fullName: 'M',
        email: 'invalid-email-format',
        acceptedPrivacy: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // 5. Unauthenticated visitors cannot access admin endpoints
  it('5. Unauthenticated visitors cannot access owner endpoints', async () => {
    const res = await request(app).get('/api/owner/requests');
    expect(res.status).toBe(401);
  });

  // 6. Authenticated non-owners cannot perform owner actions
  it('6. Authenticated non-owners cannot perform owner actions', async () => {
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../src/config');
    const nonOwnerToken = jwt.default.sign(
      { userId: 'guest_user', email: 'intruder@test.com', role: 'demo_guest' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/owner/requests')
      .set('Authorization', `Bearer ${nonOwnerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Owner privileges required');
  });

  // 7. Only the configured owner can log in and approve requests
  it('7. Only the configured owner can log in and approve requests', async () => {
    const loginRes = await request(app)
      .post('/api/owner/login')
      .send({
        email: 'admin@appointmo.demo',
        password: 'AppointmoAdmin2026!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    ownerToken = loginRes.body.token;

    // Find the pending request
    const listRes = await request(app)
      .get('/api/owner/requests?status=pending')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    const found = listRes.body.requests.find((r: any) => r.email === testEmail);
    expect(found).toBeDefined();
    requestId = found.id;

    // Approve the request
    const approveRes = await request(app)
      .post(`/api/owner/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.isMock).toBe(true);
    expect(approveRes.body.setupUrl).toBeDefined();
    expect(approveRes.body.devSetupToken).toBeDefined();
    setupToken = approveRes.body.devSetupToken;
  });

  // 8. Approval grants access only to the intended authenticated user after password setup
  it('8. Approval grants access only to the intended authenticated user', async () => {
    // Visitor sets password with their single-use setup link
    const setupRes = await request(app)
      .post('/api/access/setup-password')
      .send({
        token: setupToken,
        password: 'SecureVisitorPassword2026!',
      });

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.token).toBeDefined();
    expect(setupRes.body.user.email).toBe(testEmail);
    expect(setupRes.body.user.role).toBe('demo_guest');
    userDemoToken = setupRes.body.token;

    // Session check confirms access
    const checkRes = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${userDemoToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.active).toBe(true);

    // Re-using the single-use setup link fails
    const reuseRes = await request(app)
      .post('/api/access/setup-password')
      .send({
        token: setupToken,
        password: 'AnotherPassword2026!',
      });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error).toContain('already been used');
  });

  // 9. Unapproved / non-existent users cannot log in
  it('9. Unapproved or pending users cannot log in to access the demo', async () => {
    // Submit request for non-approved user
    await request(app)
      .post('/api/access/request')
      .send({
        fullName: 'Pending Pete',
        email: nonApprovedEmail,
        acceptedPrivacy: true,
      });

    // Attempting login fails
    const loginRes = await request(app)
      .post('/api/access/login')
      .send({
        email: nonApprovedEmail,
        password: 'AnyPassword123!',
      });

    expect(loginRes.status).toBe(401);
  });

  // 10. Rejected users cannot access the demo
  it('10. Rejected users cannot access the demo', async () => {
    const rejectedEmail = `rejected.${Date.now()}@example.com`;
    const reqRes = await request(app)
      .post('/api/access/request')
      .send({
        fullName: 'Rejected Rita',
        email: rejectedEmail,
        acceptedPrivacy: true,
      });
    expect(reqRes.status).toBe(201);

    // Fetch id
    const listRes = await request(app)
      .get('/api/owner/requests?status=pending')
      .set('Authorization', `Bearer ${ownerToken}`);
    const found = listRes.body.requests.find((r: any) => r.email === rejectedEmail);

    // Reject
    const rejectRes = await request(app)
      .post(`/api/owner/requests/${found.id}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(rejectRes.status).toBe(200);

    // Attempting login fails
    const loginRes = await request(app)
      .post('/api/access/login')
      .send({
        email: rejectedEmail,
        password: 'AnyPassword123!',
      });
    expect(loginRes.status).toBe(401);
  });

  // 11. Revoked users lose access to protected backend endpoints immediately
  it('11. Revoked users lose access to protected backend endpoints immediately', async () => {
    // Owner revokes access for Maya Lin
    const revokeRes = await request(app)
      .post(`/api/owner/requests/${requestId}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revokeRes.status).toBe(200);

    // Protected demo endpoint now immediately rejects the previous token with 403
    const sessionCheck = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${userDemoToken}`);

    expect(sessionCheck.status).toBe(403);
    expect(sessionCheck.body.error).toContain('revoked');

    // Attempting to log back in also rejects
    const reLoginRes = await request(app)
      .post('/api/access/login')
      .send({
        email: testEmail,
        password: 'SecureVisitorPassword2026!',
      });

    expect(reLoginRes.status).toBe(403);
    expect(reLoginRes.body.error).toContain('revoked');
  });

  // 12. Users cannot impersonate other approved users by changing client-side values
  it('12. Forged client tokens cannot bypass server session validation', async () => {
    const jwt = await import('jsonwebtoken');
    const forgedToken = jwt.default.sign(
      { userId: 'hacked_id', email: 'victim@appointmo.com', role: 'demo_guest' },
      'appointmo_super_secret_jwt_key_2026_dev',
      { expiresIn: '1h' }
    );

    const checkRes = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${forgedToken}`);

    // Session hash not in demo_sessions table -> 401
    expect(checkRes.status).toBe(401);
  });

  // 13. Private user data and admin credentials are not exposed
  it('13. Private user data and password hashes are never exposed in responses', async () => {
    const listRes = await request(app)
      .get('/api/owner/requests')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    const bodyText = JSON.stringify(listRes.body);
    expect(bodyText).not.toContain('password_hash');
    expect(bodyText).not.toContain('AppointmoAdmin2026!');
  });

  // 14. Zero access-code or invitation-code flow exists
  it('14. Access code redemption route no longer exists', async () => {
    const legacyCodeRes = await request(app)
      .post('/api/access/verify-code')
      .send({ code: '123456' });

    // Endpoint removed completely
    expect(legacyCodeRes.status).toBe(404);
  });

  // 15. No credentials or session secrets appear in logs or public responses
  it('15. Setup password requires minimum length and does not echo back password', async () => {
    const badPassRes = await request(app)
      .post('/api/access/setup-password')
      .send({ token: 'fake_token', password: '123' });

    expect(badPassRes.status).toBe(400);
    expect(badPassRes.body.error).toContain('at least 8 characters');
    expect(JSON.stringify(badPassRes.body)).not.toContain('123');
  });
});
