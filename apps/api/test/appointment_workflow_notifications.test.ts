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

describe('Full Appointment Workflow, Sorting, Rescheduling & Two-Way Notifications', () => {
  let bookingRef1: string;
  let token1: string;
  let apptId1: string;

  let bookingRef2: string;
  let token2: string;
  let apptId2: string;

  let serviceId: string;
  let staffId: string;
  let staffName: string;
  let alternateStaffId: string;

  // 1. Setup available slots & service info
  it('1. Fetches service and availability for customer booking', async () => {
    const sRes = await request(app).get('/api/services');
    expect(sRes.status).toBe(200);
    expect(sRes.body.services.length).toBeGreaterThan(0);
    serviceId = sRes.body.services[0].id;

    const staffRes = await request(app).get(`/api/staff?serviceId=${serviceId}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.staff.length).toBeGreaterThan(0);
    staffId = staffRes.body.staff[0].id;
    staffName = staffRes.body.staff[0].name;

    // Check if there is an alternate qualified staff
    if (staffRes.body.staff.length > 1) {
      alternateStaffId = staffRes.body.staff[1].id;
    }
  });

  // 2. Customer creates first booking -> Newest First sorting in Store Admin
  it('2. Customer creates booking #1 and it immediately appears at the TOP of Store Admin (created_at DESC)', async () => {
    // Find a weekday in Manila (+08:00)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 26);
    // Ensure Monday-Friday
    while (targetDate.getUTCDay() === 0 || targetDate.getUTCDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    const avail = await request(app).get(`/api/availability?serviceId=${serviceId}&date=${dateStr}&staffId=${staffId}`);
    expect(avail.status).toBe(200);
    expect(avail.body.slots.length).toBeGreaterThan(0);

    const slot = avail.body.slots[0];

    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId,
        staffId: slot.staffId,
        startTime: slot.startTime,
        customerName: 'First Booker',
        customerEmail: 'booker1@example.com',
        customerPhone: '+63 900 111 0001',
        notes: 'First booking test',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.appointment.status).toBe('pending');
    bookingRef1 = bookRes.body.booking.bookingReference;
    token1 = bookRes.body.booking.managementToken;
    apptId1 = bookRes.body.booking.appointment.id;

    // Query Store Admin appointment list
    const adminList = await request(app).get('/api/store/admin/appointments');
    expect(adminList.status).toBe(200);
    expect(adminList.body.appointments.length).toBeGreaterThan(0);

    // CRITICAL: The newly created booking MUST be index 0 (at the very top)
    const topAppt = adminList.body.appointments[0];
    expect(topAppt.bookingReference).toBe(bookingRef1);
    expect(topAppt.customerName).toBe('First Booker');
  });

  // 3. Customer creates second booking -> becomes the NEW top item
  it('3. Multiple bookings maintain strict newest-first ordering', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 28);
    while (targetDate.getUTCDay() === 0 || targetDate.getUTCDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    const avail = await request(app).get(`/api/availability?serviceId=${serviceId}&date=${dateStr}&staffId=${staffId}`);
    expect(avail.status).toBe(200);
    const slot = avail.body.slots[0];

    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        serviceId,
        staffId: slot.staffId,
        startTime: slot.startTime,
        customerName: 'Second Booker',
        customerEmail: 'booker2@example.com',
        customerPhone: '+63 900 111 0002',
        notes: 'Second booking test',
      });

    expect(bookRes.status).toBe(201);
    bookingRef2 = bookRes.body.booking.bookingReference;
    token2 = bookRes.body.booking.managementToken;
    apptId2 = bookRes.body.booking.appointment.id;

    const adminList = await request(app).get('/api/store/admin/appointments');
    expect(adminList.status).toBe(200);

    // Booking #2 should now be at index 0, and Booking #1 should be index 1
    expect(adminList.body.appointments[0].bookingReference).toBe(bookingRef2);
    expect(adminList.body.appointments[1].bookingReference).toBe(bookingRef1);
  });

  // 4. Admin receives notification for new bookings
  it('4. Admin receives persistent notification for new customer bookings', async () => {
    const notifRes = await request(app).get('/api/store/admin/notifications');
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBeGreaterThan(0);

    const newestNotif = notifRes.body.notifications[0];
    expect(newestNotif.isRead).toBe(false);
    expect(newestNotif.bookingReference).toBe(bookingRef2);
    expect(newestNotif.message).toContain('Second Booker');
  });

  // 5. Customer receives booking notification
  it('5. Customer receives pending confirmation notification via their management token', async () => {
    const custNotifRes = await request(app).get(`/api/bookings/${bookingRef1}/notifications?token=${token1}`);
    expect(custNotifRes.status).toBe(200);
    expect(custNotifRes.body.notifications.length).toBeGreaterThan(0);
    expect(custNotifRes.body.notifications[0].title).toContain('pending');
  });

  // 6. View Details & Audit History endpoint
  it('6. Admin can view complete appointment details with status audit history', async () => {
    const detailRes = await request(app).get(`/api/store/admin/appointments/${apptId1}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.appointment.customerName).toBe('First Booker');
    expect(detailRes.body.history.length).toBeGreaterThan(0);
    expect(detailRes.body.history[0].newStatus).toBe('pending');
  });

  // 7. Safe Rescheduling: Updates date/time, history and notifies both sides
  it('7. Admin reschedules booking atomically and generates notifications', async () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 27);
    if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() + 1);
    const date = newDate.toISOString().slice(0, 10);
    const availability = await request(app).get(`/api/availability?serviceId=${serviceId}&date=${date}&staffId=${staffId}`);
    expect(availability.body.slots.length).toBeGreaterThan(0);
    const afternoonSlot = availability.body.slots.find((slot: any) => new Date(slot.startTime).getHours() >= 13);
    const newStartTime = afternoonSlot?.startTime || availability.body.slots[0].startTime;

    const reschedRes = await request(app)
      .post(`/api/store/admin/appointments/${apptId1}/reschedule`)
      .send({
        newStartTime,
        reason: 'Customer requested afternoon slot',
      });

    expect(reschedRes.status).toBe(200);
    expect(new Date(reschedRes.body.newStartTime).toISOString()).toBe(new Date(newStartTime).toISOString());

    // Verify appointment was updated
    const apptCheck = await request(app).get(`/api/store/admin/appointments/${apptId1}`);
    expect(apptCheck.body.appointment.startTime).toBe(newStartTime);

    // Verify history recorded
    const lastHistory = apptCheck.body.history[apptCheck.body.history.length - 1];
    expect(lastHistory.reason).toContain('Customer requested afternoon slot');

    // Customer receives reschedule notification
    const custNotif = await request(app).get(`/api/bookings/${bookingRef1}/notifications?token=${token1}`);
    expect(custNotif.body.notifications[0].type).toBe('booking_rescheduled');
  });

  // 8. Conflicting reschedule is rejected with 409
  it('8. Rescheduling into an existing conflict is safely rejected with 409', async () => {
    // Attempt to reschedule booking #2 to the exact same slot as booking #1
    const appt1 = (await request(app).get(`/api/store/admin/appointments/${apptId1}`)).body.appointment;

    const conflictRes = await request(app)
      .post(`/api/store/admin/appointments/${apptId2}/reschedule`)
      .send({
        newStartTime: appt1.startTime,
        newStaffId: appt1.staffId,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toContain('conflicts with an existing booking');

    // Booking #2 should remain unchanged
    const appt2Check = await request(app).get(`/api/store/admin/appointments/${apptId2}`);
    expect(appt2Check.body.appointment.startTime).not.toBe(appt1.startTime);
  });

  // 9. Cancellation: releases slot, updates status, and notifies customer
  it('9. Customer cancels booking via portal; notifies admin and marks cancelled', async () => {
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingRef2}/cancel`)
      .send({
        token: token2,
        reason: 'Schedule conflict',
      });

    expect(cancelRes.status).toBe(200);

    // Verify cancelled in Admin view
    const adminAppt = await request(app).get(`/api/store/admin/appointments/${apptId2}`);
    expect(adminAppt.body.appointment.status).toBe('cancelled');
    expect(adminAppt.body.appointment.cancellationReason).toContain('Schedule conflict');

    // Admin receives cancellation notification
    const adminNotifs = await request(app).get('/api/store/admin/notifications');
    const cancelNotif = adminNotifs.body.notifications.find((n: any) => n.bookingReference === bookingRef2);
    expect(cancelNotif).toBeDefined();
    expect(cancelNotif.type).toBe('booking_cancelled');
  });

  // 10. Mark notification read persists across queries
  it('10. Marking notifications as read persists and updates unreadCount', async () => {
    const beforeRes = await request(app).get('/api/store/admin/notifications');
    const initialUnread = beforeRes.body.unreadCount;
    expect(initialUnread).toBeGreaterThan(0);

    const targetNotifId = beforeRes.body.notifications[0].id;
    const readRes = await request(app).patch(`/api/store/admin/notifications/${targetNotifId}/read`);
    expect(readRes.status).toBe(200);

    const afterRes = await request(app).get('/api/store/admin/notifications');
    expect(afterRes.body.unreadCount).toBe(initialUnread - 1);
    // Notification once marked read is auto-removed from unread list
    const updated = afterRes.body.notifications.find((n: any) => n.id === targetNotifId);
    expect(updated).toBeUndefined();

    // Mark all as read
    await request(app).post('/api/store/admin/notifications/mark-all-read');
    const finalRes = await request(app).get('/api/store/admin/notifications');
    expect(finalRes.body.unreadCount).toBe(0);
  });

  // 11. Privacy: Customer A cannot read Customer B's notifications
  it('11. Customer token verification prevents unauthorized cross-customer access', async () => {
    // Attempting to view Booking #1's notifications using Booking #2's token
    const spyRes = await request(app).get(`/api/bookings/${bookingRef1}/notifications?token=${token2}`);
    expect(spyRes.status).toBe(401);
  });
});
