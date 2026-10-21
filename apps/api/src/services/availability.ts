import { query, pool } from '../db';
import crypto from 'crypto';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
}

export class AvailabilityService {
  /**
   * Compute actual slots based on:
   * 1. Staff eligible for service
   * 2. Staff working hours for date
   * 3. Staff break time
   * 4. Staff time off
   * 5. Conflicting appointments
   */
  static async getAvailableSlots(businessId: string, serviceId: string, dateStr: string, requestedStaffId?: string): Promise<TimeSlot[]> {
    // 1. Get service duration
    const serviceRes = await query('SELECT duration_minutes FROM services WHERE id = $1 AND business_id = $2 AND is_active = true', [serviceId, businessId]);
    if (serviceRes.rows.length === 0) {
      throw new Error('Service not found or inactive');
    }
    const durationMinutes = serviceRes.rows[0].duration_minutes;

    // Target date in YYYY-MM-DD
    const targetDate = new Date(`${dateStr}T00:00:00+08:00`); // Asia/Manila offset (+08:00)
    const dayOfWeek = targetDate.getDay(); // 0-6

    // 2. Fetch eligible staff
    let staffQuery = `
      SELECT sp.id, sp.name
      FROM staff_profiles sp
      JOIN staff_services ss ON sp.id = ss.staff_id
      WHERE sp.business_id = $1 AND ss.service_id = $2 AND sp.is_active = true
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
      const dayStart = new Date(`${dateStr}T${wh.start_time}+08:00`);
      const dayEnd = new Date(`${dateStr}T${wh.end_time}+08:00`);
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
           AND start_time < $2 AND end_time > $3`,
        [staff.id, dayEnd, dayStart]
      );

      const existingAppointments = existingRes.rows.map(r => ({
        start: new Date(r.start_time).getTime(),
        end: new Date(r.end_time).getTime(),
      }));

      // Generate slot intervals in 30-min steps
      let current = dayStart.getTime();
      const endTimeLimit = dayEnd.getTime();
      const stepMs = 30 * 60 * 1000;
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

      // 2. Branch
      const branchRes = await client.query('SELECT id FROM branches WHERE business_id = $1 LIMIT 1', [businessId]);
      const branchId = branchRes.rows[0].id;

      const startDate = new Date(params.startTime);
      const endDate = new Date(startDate.getTime() + srv.duration_minutes * 60 * 1000);

      // 3. Resolve or assign staff
      let staffId = params.staffId;
      if (!staffId) {
        // Find first eligible staff who has no conflict
        const eligibleStaffRes = await client.query(`
          SELECT sp.id, sp.name
          FROM staff_profiles sp
          JOIN staff_services ss ON sp.id = ss.staff_id
          WHERE sp.business_id = $1 AND ss.service_id = $2 AND sp.is_active = true
        `, [businessId, params.serviceId]);

        for (const st of eligibleStaffRes.rows) {
          const conflictCheck = await client.query(`
            SELECT 1 FROM appointments
            WHERE staff_id = $1 AND status NOT IN ('cancelled')
              AND start_time < $2 AND end_time > $3
            FOR UPDATE
          `, [st.id, endDate, startDate]);

          if (conflictCheck.rows.length === 0) {
            staffId = st.id;
            break;
          }
        }

        if (!staffId) {
          throw new Error('No qualified staff available for this time slot');
        }
      } else {
        // Verify eligibility
        const eligRes = await client.query(`
          SELECT 1 FROM staff_services ss
          JOIN staff_profiles sp ON ss.staff_id = sp.id
          WHERE ss.staff_id = $1 AND ss.service_id = $2 AND sp.is_active = true
        `, [staffId, params.serviceId]);
        if (eligRes.rows.length === 0) {
          throw new Error('Selected staff member is not qualified for this service');
        }

        // Concurrency Lock: Lock conflicting appointments for this staff member
        const conflict = await client.query(`
          SELECT 1 FROM appointments
          WHERE staff_id = $1 AND status NOT IN ('cancelled')
            AND start_time < $2 AND end_time > $3
          FOR UPDATE
        `, [staffId, endDate, startDate]);

        if (conflict.rows.length > 0) {
          throw new Error('The selected time slot was just booked by another customer. Please choose another time.');
        }
      }

      // 4. Find or Create Customer
      let customerId: string;
      const custRes = await client.query(
        'SELECT id FROM customers WHERE business_id = $1 AND email = $2',
        [businessId, params.customerEmail.toLowerCase().trim()]
      );
      if (custRes.rows.length > 0) {
        customerId = custRes.rows[0].id;
        await client.query(
          'UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
          [params.customerName, params.customerPhone, customerId]
        );
      } else {
        const newCust = await client.query(
          'INSERT INTO customers (business_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
          [businessId, params.customerName, params.customerEmail.toLowerCase().trim(), params.customerPhone]
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
          booking_reference, business_id, branch_id, customer_id, service_id, staff_id,
          start_time, end_time, status, price_snapshot, currency, notes, management_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12)
        RETURNING id, booking_reference, start_time, end_time, status
      `, [
        bookingRef,
        businessId,
        branchId,
        customerId,
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
        `New booking request by ${params.customerName} for ${srv.name} on ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. (Ref: ${bookingRef})`
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
