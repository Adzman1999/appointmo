import { query, pool } from '../db';
import crypto from 'crypto';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
}

export class AvailabilityService {
  static getManilaDateString(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  /**
   * Compute actual slots based on:
   * 1. Staff eligible for service
   * 2. Staff working hours for date
   * 3. Staff break time
   * 4. Staff time off
   * 5. Conflicting appointments
   */
  static async getAvailableSlots(
    businessId: string,
    serviceId: string,
    dateStr: string,
    requestedStaffId?: string,
    excludeAppointmentId?: string
  ): Promise<TimeSlot[]> {
    // 1. Get service duration
    const serviceRes = await query(`
      SELECT s.duration_minutes,
             b.weekly_schedule AS "businessWeeklySchedule",
             b.booking_policies AS "bookingPolicies"
      FROM services s
      JOIN businesses b ON b.id = s.business_id
      WHERE s.id = $1 AND s.business_id = $2 AND s.is_active = true
    `, [serviceId, businessId]);
    if (serviceRes.rows.length === 0) {
      throw new Error('Service not found or inactive');
    }
    const durationMinutes = serviceRes.rows[0].duration_minutes;
    let businessSchedule = serviceRes.rows[0].businessWeeklySchedule;
    if (typeof businessSchedule === 'string') {
      try {
        businessSchedule = JSON.parse(businessSchedule);
      } catch {
        businessSchedule = null;
      }
    }
    let bookingPolicies = serviceRes.rows[0].bookingPolicies;
    if (typeof bookingPolicies === 'string') {
      try {
        bookingPolicies = JSON.parse(bookingPolicies);
      } catch {
        bookingPolicies = null;
      }
    }
    const configuredInterval = Number(bookingPolicies?.slotInterval);
    const slotIntervalMinutes = [15, 30, 45, 60].includes(configuredInterval) ? configuredInterval : 45;

    // Target date in YYYY-MM-DD
    const targetDate = new Date(`${dateStr}T00:00:00+08:00`); // Asia/Manila offset (+08:00)
    const dayOfWeek = targetDate.getDay(); // 0-6
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const businessDays = Array.isArray(businessSchedule) ? businessSchedule : [];
    const businessDay = businessDays.find((day: any) => String(day?.day || '').toLowerCase() === dayName.toLowerCase())
      || businessDays[(dayOfWeek + 6) % 7]; // Store settings are ordered Monday through Sunday.
    if (businessDays.length > 0 && (!businessDay || !businessDay.isWorking)) {
      return [];
    }
    const businessStart = businessDay?.startTime ? new Date(`${dateStr}T${businessDay.startTime}+08:00`) : null;
    const businessEnd = businessDay?.endTime ? new Date(`${dateStr}T${businessDay.endTime}+08:00`) : null;

    // 2. Fetch eligible staff
    let staffQuery = `
      SELECT sp.id, sp.name
      FROM staff_profiles sp
      JOIN staff_services ss ON sp.id = ss.staff_id
      WHERE sp.business_id = $1 AND ss.service_id = $2 AND sp.is_active = true
        AND COALESCE(LOWER(sp.status), 'active') = 'active'
    `;
    const staffParams: any[] = [businessId, serviceId];
    if (requestedStaffId) {
      staffQuery += ' AND sp.id = $3';
      staffParams.push(requestedStaffId);
    }

    const staffRes = await query(staffQuery, staffParams);
    const eligibleStaff = staffRes.rows;

    const availableSlots: TimeSlot[] = [];

    for (const staff of eligibleStaff) {
      // Get working hours
      const whRes = await query(
        `SELECT start_time, end_time, break_start, break_end, is_working
         FROM staff_working_hours
         WHERE staff_id = $1 AND day_of_week = $2`,
        [staff.id, dayOfWeek]
      );

      if (whRes.rows.length === 0 || !whRes.rows[0].is_working) {
        continue; // not working this day
      }

      const wh = whRes.rows[0];

      // Parse day start and end timestamps in Manila timezone
      const staffDayStart = new Date(`${dateStr}T${wh.start_time}+08:00`);
      const staffDayEnd = new Date(`${dateStr}T${wh.end_time}+08:00`);
      const dayStart = businessStart && businessStart > staffDayStart ? businessStart : staffDayStart;
      const dayEnd = businessEnd && businessEnd < staffDayEnd ? businessEnd : staffDayEnd;
      if (dayStart >= dayEnd) {
        continue;
      }
      const breakStart = wh.break_start ? new Date(`${dateStr}T${wh.break_start}+08:00`) : null;
      const breakEnd = wh.break_end ? new Date(`${dateStr}T${wh.break_end}+08:00`) : null;

      // Check time off
      const timeOffRes = await query(
        `SELECT 1 FROM staff_time_off
         WHERE staff_id = $1 AND start_date <= $2 AND end_date >= $3`,
        [staff.id, dayEnd, dayStart]
      );
      if (timeOffRes.rows.length > 0) {
        continue;
      }

      // Fetch existing appointments for this staff on this day
      const existingRes = await query(
        `SELECT start_time, end_time
         FROM appointments
         WHERE staff_id = $1 AND status NOT IN ('cancelled')
           AND ($4::uuid IS NULL OR id != $4::uuid)
           AND start_time < $2 AND end_time > $3`,
        [staff.id, dayEnd, dayStart, excludeAppointmentId || null]
      );

      const existingAppointments = existingRes.rows.map(r => ({
        start: new Date(r.start_time).getTime(),
        end: new Date(r.end_time).getTime(),
      }));

      // Generate customer start times using the store's configured grid interval.
      let current = dayStart.getTime();
      const endTimeLimit = dayEnd.getTime();
      const stepMs = slotIntervalMinutes * 60 * 1000;
      const durationMs = durationMinutes * 60 * 1000;

      while (current + durationMs <= endTimeLimit) {
        const slotStart = current;
        const slotEnd = current + durationMs;

        // Check break overlap
        let overlapsBreak = false;
        if (breakStart && breakEnd) {
          const bStart = breakStart.getTime();
          const bEnd = breakEnd.getTime();
          if (slotStart < bEnd && slotEnd > bStart) {
            overlapsBreak = true;
          }
        }

        // Check appointment conflicts
        let overlapsAppt = false;
        for (const appt of existingAppointments) {
          if (slotStart < appt.end && slotEnd > appt.start) {
            overlapsAppt = true;
            break;
          }
        }

        if (!overlapsBreak && !overlapsAppt) {
          availableSlots.push({
            startTime: new Date(slotStart).toISOString(),
            endTime: new Date(slotEnd).toISOString(),
            staffId: staff.id,
            staffName: staff.name,
          });
        }

        current += stepMs;
      }
    }

    // Sort slots by start time
    return availableSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Concurrency-safe booking creation with transaction and atomic conflict checking
   */
  static async bookGuestAppointment(params: {
    serviceId: string;
    staffId?: string;
    startTime: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookerUserId?: string;
    bookingForSomeoneElse?: boolean;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    notes?: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get service details
      const serviceRes = await client.query('SELECT s.business_id, s.name, s.duration_minutes, s.price, b.currency FROM services s JOIN businesses b ON s.business_id = b.id WHERE s.id = $1 AND s.is_active = true', [params.serviceId]);
      if (serviceRes.rows.length === 0) {
        throw new Error('Selected service is not available');
      }
      const srv = serviceRes.rows[0];
      const businessId = srv.business_id;

      // Authenticated customers remain the booking owner. Ignore client-supplied
      // name/email so a booking cannot be attributed to somebody else's account.
      let customerName = params.customerName.trim();
      let customerEmail = params.customerEmail.trim().toLowerCase();
      let customerPhone = params.customerPhone.trim();
      if (params.bookerUserId) {
        const ownerRes = await client.query(`
          SELECT id, name, email, phone
          FROM users
          WHERE id = $1 AND role = 'customer' AND status = 'approved'
          FOR SHARE
        `, [params.bookerUserId]);
        if (ownerRes.rows.length === 0) {
          throw new Error('Your customer account could not be verified. Please sign in again.');
        }
        const owner = ownerRes.rows[0];
        customerName = owner.name;
        customerEmail = owner.email.trim().toLowerCase();
        customerPhone = owner.phone?.trim() || customerPhone;
        if (!owner.phone && customerPhone) {
          await client.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [customerPhone, owner.id]);
        }
      }

      if (!customerPhone) {
        throw new Error('Add a phone number to your account before booking.');
      }
      const recipientName = params.bookingForSomeoneElse ? params.recipientName?.trim() : null;
      const recipientEmail = params.bookingForSomeoneElse ? params.recipientEmail?.trim().toLowerCase() || null : null;
      const recipientPhone = params.bookingForSomeoneElse ? params.recipientPhone?.trim() || null : null;
      if (params.bookingForSomeoneElse && (!recipientName || recipientName.length < 2 || (recipientPhone && recipientPhone.length < 7))) {
        throw new Error('Enter the recipient’s name and a valid phone number if provided.');
      }

      // 2. Branch
      const branchRes = await client.query('SELECT id FROM branches WHERE business_id = $1 LIMIT 1', [businessId]);
      const branchId = branchRes.rows[0].id;

      const startDate = new Date(params.startTime);
      if (!Number.isFinite(startDate.getTime())) {
        throw new Error('Choose a valid appointment time');
      }
      const endDate = new Date(startDate.getTime() + srv.duration_minutes * 60 * 1000);

      // Resolve from current availability so a direct or stale request cannot bypass
      // the staff member's service qualifications, working hours, breaks, or time off.
      const localDate = this.getManilaDateString(startDate);
      const matchingSlots = (await this.getAvailableSlots(businessId, params.serviceId, localDate, params.staffId))
        .filter((slot) => new Date(slot.startTime).getTime() === startDate.getTime());
      if (matchingSlots.length === 0) {
        throw new Error('This time is outside the selected staff schedule or is no longer available. Please choose another slot.');
      }

      let staffId: string | undefined;
      for (const slot of matchingSlots) {
        // Recheck conflicts inside the booking transaction to catch a slot taken
        // after availability was displayed to the customer.
        const conflict = await client.query(`
          SELECT 1 FROM appointments
          WHERE staff_id = $1 AND status NOT IN ('cancelled')
            AND start_time < $2 AND end_time > $3
          FOR UPDATE
        `, [slot.staffId, endDate, startDate]);
        if (conflict.rows.length === 0) {
          staffId = slot.staffId;
          break;
        }
      }
      if (!staffId) {
        throw new Error('The selected time slot was just booked by another customer. Please choose another time.');
      }

      // 4. Find or Create Customer
      let customerId: string;
      const custRes = await client.query(
        'SELECT id FROM customers WHERE business_id = $1 AND email = $2',
        [businessId, customerEmail]
      );
      if (custRes.rows.length > 0) {
        customerId = custRes.rows[0].id;
        await client.query(
          'UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
          [customerName, customerPhone, customerId]
        );
      } else {
        const newCust = await client.query(
          'INSERT INTO customers (business_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
          [businessId, customerName, customerEmail, customerPhone]
        );
        customerId = newCust.rows[0].id;
      }

      // 5. Generate secure booking reference and secret management token
      const bookingRef = 'APT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const rawManagementToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawManagementToken).digest('hex');

      // 6. Insert Appointment with initial status: pending
      const apptRes = await client.query(`
        INSERT INTO appointments (
          booking_reference, business_id, branch_id, customer_id, booked_by_user_id, is_guest_booking,
          recipient_name, recipient_email, recipient_phone, service_id, staff_id,
          start_time, end_time, status, price_snapshot, currency, notes, management_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15, $16, $17)
        RETURNING id, booking_reference, start_time, end_time, status,
                  recipient_name AS "recipientName", recipient_email AS "recipientEmail", recipient_phone AS "recipientPhone"
      `, [
        bookingRef,
        businessId,
        branchId,
        customerId,
        params.bookerUserId || null,
        !params.bookerUserId,
        recipientName,
        recipientEmail,
        recipientPhone,
        params.serviceId,
        staffId,
        startDate,
        endDate,
        srv.price,
        srv.currency,
        params.notes || '',
        tokenHash,
      ]);

      await client.query(`
        INSERT INTO appointment_status_history (appointment_id, new_status, changed_by, reason)
        VALUES ($1, 'pending', 'guest_customer', 'Initial booking request created (pending confirmation)')
      `, [apptRes.rows[0].id]);

      // 7. Generate Two-Way Notifications
      // A. Admin notification
      await client.query(`
        INSERT INTO notifications (
          business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
        ) VALUES ($1, $2, 'admin', 'admin', 'booking_created', $3, $4)
      `, [
        businessId,
        apptRes.rows[0].id,
        `New booking received: ${srv.name}`,
        `New booking request by ${customerName}${recipientName ? ` for ${recipientName}` : ''} for ${srv.name} on ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. (Ref: ${bookingRef})`
      ]);

      // B. Customer notification
      await client.query(`
        INSERT INTO notifications (
          business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
        ) VALUES ($1, $2, 'customer', $3, 'booking_created', $4, $5)
      `, [
        businessId,
        apptRes.rows[0].id,
        bookingRef,
        'Booking received & pending confirmation',
        `Your booking request for ${srv.name} on ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} has been received and is awaiting studio confirmation.`
      ]);

      await client.query('COMMIT');

      return {
        appointment: apptRes.rows[0],
        bookingReference: bookingRef,
        managementToken: rawManagementToken, // Returned to guest for URL bookmark / management
        serviceName: srv.name,
        price: srv.price,
        currency: srv.currency,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
