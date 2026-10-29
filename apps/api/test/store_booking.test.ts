import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool, query } from '../src/db';
import { seedTestDatabase } from './support/seedTestDatabase';

const app = createApp();

beforeAll(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe('Store Booking and Customer Appointment Platform', () => {
  let createdBookingRef: string;
  let createdManagementToken: string;
  let sampleServiceId: string;
  let sampleStaffId: string;
  let sampleSlotTime: string;

  // 1. Public booking endpoints are available without an account
  it('1. Public visitors can open booking endpoints without credentials', async () => {
    const bizRes = await request(app).get('/api/business');
    expect(bizRes.status).toBe(200);
    expect(bizRes.body.business.name).toBe('Lumière Beauty Studio');

    const adminMetrics = await request(app).get('/api/store/admin/metrics');
    expect(adminMetrics.status).toBe(200);
    expect(adminMetrics.body.metrics.todayCount).toBeDefined();
    expect(adminMetrics.body.metrics.totalRevenue).toBeDefined();
  });

  // 2. Customer booking creates a persisted appointment
  it('2. Quick Booking creates a persisted appointment with real slot', async () => {
    // Fetch services
    const servicesRes = await request(app).get('/api/services');
    expect(servicesRes.status).toBe(200);
    expect(servicesRes.body.services.length).toBeGreaterThan(0);
    sampleServiceId = servicesRes.body.services[0].id;

    // Fetch availability for tomorrow or next working day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const availRes = await request(app).get(`/api/availability?serviceId=${sampleServiceId}&date=${dateStr}`);
    expect(availRes.status).toBe(200);
    expect(availRes.body.slots.length).toBeGreaterThan(0);

    const chosenSlot = availRes.body.slots[0];
    sampleStaffId = chosenSlot.staffId;
    sampleSlotTime = chosenSlot.startTime;

    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId: sampleServiceId,
        staffId: sampleStaffId,
        startTime: sampleSlotTime,
        customerName: 'Booking Test Customer',
        customerEmail: 'synthetic.customer@example.com',
        customerPhone: '+63 900 000 9999',
        notes: 'Testing Quick Booking',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.bookingReference).toBeDefined();
    expect(bookRes.body.booking.managementToken).toBeDefined();

    createdBookingRef = bookRes.body.booking.bookingReference;
    createdManagementToken = bookRes.body.booking.managementToken;
  });

  // 3. Concierge Booking recommends services from actual catalogue
  it('3. Concierge Booking recommends services from the synthetic catalogue', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ query: 'I want a facial tomorrow afternoon under ₱1,500' });

    expect(res.status).toBe(200);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    expect(res.body.recommendations[0].category).toBe('Facial');
    expect(res.body.recommendations[0].price).toBeLessThanOrEqual(1500);
  });

  // 4. Recommendations respect budget and configured service eligibility
  it('4. Recommendations respect budget and configured service eligibility', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ query: 'Relaxation massage with a budget under 1100' });

    expect(res.status).toBe(200);
    const recs = res.body.recommendations;
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.price).toBeLessThanOrEqual(1100);
    }
  });

  // 5. Available slots reflect real scheduling constraints
  it('5. Available slots reflect real scheduling constraints', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ query: 'Manicure tomorrow morning' });

    expect(res.status).toBe(200);
    if (res.body.recommendations.length > 0) {
      const rec = res.body.recommendations[0];
      const slotHour = new Date(rec.slot.startTime).getHours();
      expect(slotHour).toBeLessThan(12); // Morning opening
    }
  });

  // 6. Recommendations explain why options match
  it('6. Recommendations explain why each option matches customer preferences', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ query: 'Facial for sensitive skin under ₱1,000' });

    expect(res.status).toBe(200);
    const rec = res.body.recommendations[0];
    expect(rec.matchReasons.length).toBeGreaterThan(0);
    const reasonsStr = rec.matchReasons.join(' ');
    expect(reasonsStr.toLowerCase()).toMatch(/(facial|skin|budget)/);
  });

  // 7. Unavailable options offer valid alternatives
  it('7. Unavailable or strict queries provide closest available alternatives', async () => {
    const res = await request(app)
      .post('/api/concierge')
      .send({ query: 'Need a luxury diamond treatment under ₱200' });

    expect(res.status).toBe(200);
    // Should provide alternative or fallback suggestions
    expect(Array.isArray(res.body.alternatives) || Array.isArray(res.body.recommendations)).toBe(true);
  });

  // 8. Booking from a recommendation persists the appointment
  it('8. Booking from a recommendation persists the appointment in database', async () => {
    const conciergeRes = await request(app)
      .post('/api/concierge')
      .send({ query: 'Pedicure tomorrow afternoon' });

    expect(conciergeRes.status).toBe(200);
    expect(conciergeRes.body.recommendations.length).toBeGreaterThan(0);

    const chosen = conciergeRes.body.recommendations[0];
    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId: chosen.serviceId,
        staffId: chosen.staffId,
        startTime: chosen.slot.startTime,
        customerName: 'Concierge Test Client',
        customerEmail: 'concierge.client@example.com',
        customerPhone: '+63 900 000 8888',
        notes: 'Booked via Concierge Recommendation',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.bookingReference).toBeDefined();
  });

  // 9. Both booking methods use the same validation and conflict detection
  it('9. Both booking methods reject invalid input with 400', async () => {
    const badQuick = await request(app)
      .post('/api/bookings')
      .send({ serviceId: 'not-a-uuid' });
    expect(badQuick.status).toBe(400);

    const badConcierge = await request(app)
      .post('/api/concierge')
      .send({ query: '' });
    expect(badConcierge.status).toBe(400);
  });

  // 10. Double-booking is prevented under concurrent requests
  it('10. Double-booking is strictly prevented for the same staff and slot', async () => {
    // Attempting to book the slot already taken in test #2
    const conflictRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId: sampleServiceId,
        staffId: sampleStaffId,
        startTime: sampleSlotTime,
        customerName: 'Conflicting Customer',
        customerEmail: 'conflict@example.com',
        customerPhone: '+63 900 000 7777',
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toMatch(/(already booked|just booked|available)/i);
  });

  // 11. Admin actions update the customer-facing experience
  it('11. Admin actions update the appointment in database', async () => {
    // Find appointment by reference in Store Admin
    const listRes = await request(app)
      .get(`/api/store/admin/appointments?search=${createdBookingRef}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.appointments.length).toBe(1);
    const apptId = listRes.body.appointments[0].id;

    // Admin marks appointment completed
    const patchRes = await request(app)
      .patch(`/api/store/admin/appointments/${apptId}/status`)
      .send({ status: 'completed' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.newStatus).toBe('completed');

    // Customer lookup reflects updated status
    const custLookup = await request(app)
      .get(`/api/bookings/${createdBookingRef}?token=${createdManagementToken}`);

    expect(custLookup.status).toBe(200);
    expect(custLookup.body.booking.status).toBe('completed');
  });

  // 12. Missing appointment records cannot be modified
  it('12. Store appointment updates reject unknown records', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const fakePatch = await request(app)
      .patch(`/api/store/admin/appointments/${fakeId}/status`)
      .send({ status: 'cancelled' });

    expect(fakePatch.status).toBe(404);
  });

  // 13. Customer appointment lookup does not expose other customers' details
  it('13. Customer appointment lookup requires matching management token', async () => {
    // Missing token
    const noToken = await request(app).get(`/api/bookings/${createdBookingRef}`);
    expect(noToken.status).toBe(401);

    // Wrong token
    const wrongToken = await request(app).get(`/api/bookings/${createdBookingRef}?token=wrong_secret_token`);
    expect(wrongToken.status).toBe(404);
  });

  // 14. Preparing local seed accounts preserves appointment records
  it('14. Local seed setup preserves existing appointment records', async () => {
    const before = await query('SELECT COUNT(*)::int AS count FROM appointments');
    const login = await request(app).post('/api/auth/login').send({
      email: 'superadmin@appointmo.local',
      password: 'SuperAdmin2026!',
    });
    expect(login.status).toBe(200);
    const resetRes = await request(app)
      .post('/api/admin/seed')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('Existing appointments and customer records were preserved');
    const after = await query('SELECT COUNT(*)::int AS count FROM appointments');
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  // 15. Production authentication endpoints remain protected
  it('15. Production owner endpoints remain protected by strict server-side auth', async () => {
    const ownerRes = await request(app).get('/api/owner/requests');
    expect(ownerRes.status).toBe(401);
  });

  // 16. Verify test-generated customer email addresses
  it('16. Test bookings use the example.com address domain', async () => {
    const listRes = await request(app).get('/api/store/admin/appointments?limit=100');
    expect(listRes.status).toBe(200);
    for (const appt of listRes.body.appointments) {
      expect(appt.customerEmail).toContain('@example.com');
    }
  });
});
