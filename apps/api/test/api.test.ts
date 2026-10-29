import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { seedTestDatabase } from './support/seedTestDatabase';

const app = createApp();

beforeAll(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe('API Health and Public Endpoints', () => {
  it('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/business returns Lumière Beauty Studio details', async () => {
    const res = await request(app).get('/api/business');
    expect(res.status).toBe(200);
    expect(res.body.business.name).toBe('Lumière Beauty Studio');
    expect(res.body.business.currency).toBe('PHP');
  });

  it('GET /api/services returns 6 seeded services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBe(6);
  });
});

describe('Access Request Lifecycle', () => {
  let requestId: string;
  let invitationToken: string;

  it('submits a access request', async () => {
    const uniqueEmail = `jane.${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/access-requests/requests')
      .send({
        fullName: 'Jane Doe',
        email: uniqueEmail,
        businessName: 'Doe Aesthetics',
        message: 'Interested in booking software',
        acceptedPrivacy: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.request.email).toBe(uniqueEmail);
    expect(res.body.request.status).toBe('pending');
    requestId = res.body.request.id;
  });

  it('rejects access without valid admin authentication', async () => {
    const res = await request(app).get('/api/access-requests/requests');
    expect(res.status).toBe(401);
  });

  it('allows platform admin to login and approve request', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'superadmin@appointmo.local',
        password: 'SuperAdmin2026!',
      });
    expect(loginRes.status).toBe(200);
    const adminToken = loginRes.body.token;

    // Approve
    const approveRes = await request(app)
      .post(`/api/access-requests/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.invitationToken).toBeDefined();
    invitationToken = approveRes.body.invitationToken;
  });

  it('visitor redeems invitation token to receive invited access session', async () => {
    const redeemRes = await request(app)
      .post('/api/access-requests/redeem')
      .send({ token: invitationToken });

    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body.token).toBeDefined();
    expect(redeemRes.body.user.role).toBe('access_guest');

    const sessionRes = await request(app)
      .get('/api/access/session')
      .set('Authorization', `Bearer ${redeemRes.body.token}`);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.active).toBe(true);
  });
});

describe('Booking & Concurrency Conflict Protection', () => {
  it('creates a guest booking and rejects immediate concurrent double booking', async () => {
    // 1. Get a service and slot
    const sRes = await request(app).get('/api/services');
    const service = sRes.body.services[0];

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 10);
    // Ensure not Sunday
    if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = targetDate.toISOString().split('T')[0];

    const availRes = await request(app).get(`/api/availability?serviceId=${service.id}&date=${dateStr}`);
    expect(availRes.status).toBe(200);
    expect(availRes.body.slots.length).toBeGreaterThan(0);

    const chosenSlot = availRes.body.slots[0];

    // Book first
    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId: service.id,
        staffId: chosenSlot.staffId,
        startTime: chosenSlot.startTime,
        customerName: 'Test Booking Customer',
        customerEmail: 'test.booker@example.com',
        customerPhone: '+63 917 111 2222',
        notes: 'Integration test appointment',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.bookingReference).toBeDefined();
    const { bookingReference, managementToken } = bookRes.body.booking;

    // 2. Attempt double booking identical slot with same staff
    const conflictRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId: service.id,
        staffId: chosenSlot.staffId,
        startTime: chosenSlot.startTime,
        customerName: 'Conflicting Customer',
        customerEmail: 'conflict@example.com',
        customerPhone: '+63 917 999 8888',
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toMatch(/(booked by another customer|no longer available|not available)/i);

    // 3. Customer can securely look up their booking
    const lookupRes = await request(app)
      .get(`/api/bookings/${bookingReference}?token=${managementToken}`);
    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.booking.bookingReference).toBe(bookingReference);
    expect(lookupRes.body.booking.customerName).toBe('Test Booking Customer');

    // 4. Customer can cancel their booking
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingReference}/cancel`)
      .send({ token: managementToken, reason: 'Schedule changed' });
    expect(cancelRes.status).toBe(200);
  });
});

describe('Concierge Engine', () => {
  it('returns explainable recommendations matching query preferences', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({
        query: 'I want a facial tomorrow afternoon under 1500',
      });

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toBeInstanceOf(Array);
    if (res.body.recommendations.length > 0) {
      const rec = res.body.recommendations[0];
      expect(rec.category).toBe('Facial');
      expect(rec.price).toBeLessThanOrEqual(1500);
      expect(rec.matchReasons.length).toBeGreaterThan(0);
    }
  });
});
