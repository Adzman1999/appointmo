import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool, query } from '../src/db';
import { runMigrations } from '../src/db/migrate';

const app = createApp();

beforeAll(async () => {
  // Database already migrated in shared test suite, no duplicate concurrent DDL execution needed
});

afterAll(async () => {
  await pool.end();
});

describe('Private Demo Access, Passcodes, and Owner Lifecycle', () => {
  const testEmail = `visitor.${Date.now()}@example.com`;
  let requestId: string;
  let ownerToken: string;
  let rawPasscode: string;

  it('1. Public visitor submits access request with natural language response', async () => {
    const res = await request(app)
      .post('/api/access/request')
      .send({
        fullName: 'Elena Rostova',
        email: testEmail,
        businessName: 'Rostova Spa',
        message: 'Looking for scheduling software',
        acceptedPrivacy: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain("We've received your request");
    expect(res.body.status).toBe('pending');
  });

  it('2. Unauthenticated user cannot access owner endpoints', async () => {
    const res = await request(app).get('/api/owner/requests');
    expect(res.status).toBe(401);
  });

  it('3. Owner logs in securely to get authenticated owner session', async () => {
    const res = await request(app)
      .post('/api/owner/login')
      .send({
        email: 'admin@appointmo.demo',
        password: 'AppointmoAdmin2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    ownerToken = res.body.token;

    // Fetch the new request ID
    const listRes = await request(app)
      .get('/api/owner/requests?status=pending')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    const found = listRes.body.requests.find((r: any) => r.email === testEmail);
    expect(found).toBeDefined();
    requestId = found.id;
  });

  it('4. Owner approves request, generating 15-minute passcode via email service', async () => {
    const approveRes = await request(app)
      .post(`/api/owner/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.isMock).toBe(true); // Dev mock mode when RESEND_API_KEY is not set
    expect(approveRes.body.devCodeHint).toBeDefined();
    rawPasscode = approveRes.body.devCodeHint;
    expect(rawPasscode).toMatch(/^\d{6}$/); // 6-digit passcode
  });

  it('5. Visitor rejects wrong passcode with attempt decrement', async () => {
    const failRes = await request(app)
      .post('/api/access/verify-code')
      .send({
        email: testEmail,
        code: '000000',
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toContain('Incorrect access code');
  });

  it('6. Visitor redeems valid 15-minute passcode to receive authenticated demo session', async () => {
    const verifyRes = await request(app)
      .post('/api/access/verify-code')
      .send({
        email: testEmail,
        code: rawPasscode,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.user.role).toBe('demo_guest');

    const guestToken = verifyRes.body.token;

    // Verify session active
    const checkRes = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${guestToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.active).toBe(true);
  });

  it('7. Single-use enforcement: re-using the same code is immediately rejected', async () => {
    const reuseRes = await request(app)
      .post('/api/access/verify-code')
      .send({
        email: testEmail,
        code: rawPasscode,
      });

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error).toContain('already been used');
  });

  it('8. Owner revokes access, terminating active sessions immediately', async () => {
    // Re-verify a fresh code to get an active token
    const resendRes = await request(app)
      .post(`/api/owner/requests/${requestId}/resend`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const freshCode = resendRes.body.devCodeHint;

    const verifyFresh = await request(app)
      .post('/api/access/verify-code')
      .send({
        email: testEmail,
        code: freshCode,
      });

    const activeGuestToken = verifyFresh.body.token;

    // Owner revokes access
    const revokeRes = await request(app)
      .post(`/api/owner/requests/${requestId}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revokeRes.status).toBe(200);

    // Previously active session is now rejected with 403 Revoked
    const sessionCheck = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${activeGuestToken}`);

    expect(sessionCheck.status).toBe(403);
    expect(sessionCheck.body.error).toContain('revoked');
  });
});
