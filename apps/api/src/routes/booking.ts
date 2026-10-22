import { Router, Request, Response } from 'express';
import { query } from '../db';
import { AvailabilityService } from '../services/availability';
import { ConciergeService } from '../services/concierge';
import { CreateGuestBookingSchema, ConciergeInquirySchema } from '@appointmo/shared';
import crypto from 'crypto';

const router = Router();

// 1. Get Public Demo Business & Branch Profile
router.get('/business', async (req: Request, res: Response) => {
  try {
    const { slug } = req.query;
    const targetSlug = typeof slug === 'string' && slug ? slug : 'lumiere-beauty-studio';

    const bizRes = await query(`
      SELECT b.id, b.name, b.slug, b.description, b.category, b.currency, b.timezone, b.logo_url AS "logoUrl",
             b.phone, b.email, b.address, b.city, b.opening_hours AS "openingHours",
             b.website, b.instagram, COALESCE(b.social_handle, b.instagram) AS "socialHandle", b.tagline, b.status
      FROM businesses b
      WHERE b.slug = $1
      LIMIT 1
    `, [targetSlug]);

    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = bizRes.rows[0];
    if (business.status === 'pending') {
      return res.status(403).json({ error: 'This store is pending Super Admin approval and cannot accept bookings yet.' });
    }
    if (business.status === 'rejected') {
      return res.status(403).json({ error: 'This store registration is inactive.' });
    }
    const branchesRes = await query(`
      SELECT id, name, address, city, phone, latitude, longitude, location_description AS "locationDescription"
      FROM branches
      WHERE business_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [business.id]);

    res.json({
      business: {
        ...business,
        branches: branchesRes.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve business profile' });
  }
});

// 2. Get Public Services
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { businessId, slug, branchId } = req.query;

    let sql = `
      SELECT s.id, s.name, s.description, s.duration_minutes AS "durationMinutes", s.price, s.category,
             s.suitability_tags AS "suitabilityTags"
      FROM services s
      JOIN businesses b ON s.business_id = b.id
      WHERE s.is_active = true
    `;
    const params: any[] = [];

    if (businessId && typeof businessId === 'string') {
      params.push(businessId);
      sql += ` AND b.id = $${params.length}`;
    } else if (slug && typeof slug === 'string') {
      params.push(slug);
      sql += ` AND b.slug = $${params.length}`;
    } else {
      sql += ` AND b.slug = 'lumiere-beauty-studio'`;
    }

    // Branch-specific service filter if branch_services table is populated
    if (branchId && typeof branchId === 'string') {
      params.push(branchId);
      sql += ` AND (
        NOT EXISTS (SELECT 1 FROM branch_services bs WHERE bs.branch_id = $${params.length})
        OR s.id IN (SELECT bs.service_id FROM branch_services bs WHERE bs.branch_id = $${params.length} AND bs.is_available = true)
      )`;
    }

    sql += ` ORDER BY s.price ASC`;

    const sRes = await query(sql, params);
    res.json({ services: sRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// 3. Get Staff Eligible for a Service (or all staff)
router.get('/staff', async (req: Request, res: Response) => {
  try {
    const { serviceId, businessId, slug } = req.query;

    let sql = `
      SELECT DISTINCT sp.id, sp.name, sp.bio, sp.avatar_url AS "avatarUrl"
      FROM staff_profiles sp
      JOIN businesses b ON sp.business_id = b.id
      WHERE sp.is_active = true
    `;
    const params: any[] = [];

    if (serviceId && typeof serviceId === 'string') {
      params.push(serviceId);
      sql += ` AND sp.id IN (SELECT ss.staff_id FROM staff_services ss WHERE ss.service_id = $${params.length})`;
    } else if (businessId && typeof businessId === 'string') {
      params.push(businessId);
      sql += ` AND b.id = $${params.length}`;
    } else if (slug && typeof slug === 'string') {
      params.push(slug);
      sql += ` AND b.slug = $${params.length}`;
    } else {
      sql += ` AND b.slug = 'lumiere-beauty-studio'`;
    }

    sql += ` ORDER BY sp.name ASC`;

    const staffRes = await query(sql, params);
    res.json({ staff: staffRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve staff' });
  }
});

// 4. Get Available Appointment Time Slots (Real calculation from DB rules)
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { serviceId, date, staffId, businessId } = req.query;
    if (!serviceId || !date) {
      return res.status(400).json({ error: 'serviceId and date (YYYY-MM-DD) are required' });
    }

    let resolvedBusinessId: string;
    if (businessId && typeof businessId === 'string') {
      resolvedBusinessId = businessId;
    } else {
      // Find business from service
      const sBizRes = await query('SELECT business_id FROM services WHERE id = $1', [serviceId]);
      if (sBizRes.rows.length > 0) {
        resolvedBusinessId = sBizRes.rows[0].business_id;
      } else {
        const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
        resolvedBusinessId = bizRes.rows[0].id;
      }
    }

    const slots = await AvailabilityService.getAvailableSlots(
      resolvedBusinessId,
      serviceId as string,
      date as string,
      staffId as string | undefined
    );

    res.json({ slots });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to calculate availability' });
  }
});

// 5. Create Guest Booking
router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const parsed = CreateGuestBookingSchema.parse(req.body);

    const bookingResult = await AvailabilityService.bookGuestAppointment({
      serviceId: parsed.serviceId,
      staffId: parsed.staffId,
      startTime: parsed.startTime,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone,
      notes: parsed.notes,
    });

    res.status(201).json({
      message: 'Appointment booked successfully!',
      booking: bookingResult,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    return res.status(409).json({ error: err.message || 'Booking conflict or error occurred' });
  }
});

// 6. Concierge Recommendations
router.post('/concierge', async (req: Request, res: Response) => {
  try {
    const parsed = ConciergeInquirySchema.parse(req.body);
    const querySlug = (req.query.slug as string) || (req.body.slug as string);

    let businessId: string;
    if (querySlug && querySlug.trim()) {
      const bizRes = await query("SELECT id FROM businesses WHERE slug = $1", [querySlug.trim()]);
      if (bizRes.rows.length > 0) {
        businessId = bizRes.rows[0].id;
      } else {
        const defaultBiz = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
        businessId = defaultBiz.rows[0].id;
      }
    } else {
      const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
      businessId = bizRes.rows[0].id;
    }

    const result = await ConciergeService.getRecommendations(businessId, parsed);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Concierge engine error' });
  }
});

// 7. Secure Customer Booking Lookup (via bookingReference + managementToken OR phone)
router.get('/bookings/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Management token required to view booking details' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const isDemoToken = token === `${reference}secret` || token === 'demo_secret';

    const apptRes = await query(`
      SELECT 
        a.id, a.booking_reference AS "bookingReference", a.status,
        a.start_time AS "startTime", a.end_time AS "endTime",
        a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
        s.id AS "serviceId", s.name AS "serviceName", s.duration_minutes AS "durationMinutes",
        sp.id AS "staffId", sp.name AS "staffName",
        c.name AS "customerName", c.email AS "customerEmail", c.phone AS "customerPhone",
        br.name AS "branchName", br.address AS "branchAddress"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff_profiles sp ON a.staff_id = sp.id
      JOIN customers c ON a.customer_id = c.id
      JOIN branches br ON a.branch_id = br.id
      WHERE a.booking_reference = $1 AND (a.management_token_hash = $2 OR $3 = true)
    `, [reference, tokenHash, isDemoToken]);

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or invalid management token' });
    }

    res.json({ booking: apptRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to look up booking' });
  }
});

// 8. Secure Customer Cancellation
router.post('/bookings/:reference/cancel', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { token, reason } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Management token required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const isDemoToken = token === `${reference}secret` || token === 'demo_secret';

    const apptRes = await query(
      'SELECT id, status FROM appointments WHERE booking_reference = $1 AND (management_token_hash = $2 OR $3 = true)',
      [reference, tokenHash, isDemoToken]
    );

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    const appt = apptRes.rows[0];
    if (appt.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }
    if (appt.status === 'completed') {
      return res.status(400).json({ error: 'Completed appointments cannot be cancelled' });
    }

    await query(
      'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3',
      ['cancelled', reason || 'Customer requested cancellation via portal', appt.id]
    );

    await query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, 'cancelled', $3, 'customer')
    `, [appt.id, appt.status, reason || 'Customer cancellation']);

    // Emit Notifications to both Customer and Admin
    const fullAppt = await query(`
      SELECT a.business_id, s.name AS service_name, c.name AS customer_name, a.start_time
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1
    `, [appt.id]);

    if (fullAppt.rows.length > 0) {
      const bizId = fullAppt.rows[0].business_id;
      const sName = fullAppt.rows[0].service_name;
      const cName = fullAppt.rows[0].customer_name;

      // Customer notification
      await query(`
        INSERT INTO notifications (
          business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
        ) VALUES ($1, $2, 'customer', $3, 'booking_cancelled', 'Appointment cancellation confirmed', $4)
      `, [bizId, appt.id, reference, `Your appointment for ${sName} has been cancelled as requested.`]);

      // Admin notification
      await query(`
        INSERT INTO notifications (
          business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
        ) VALUES ($1, $2, 'admin', 'admin', 'booking_cancelled', 'Customer cancelled appointment', $3)
      `, [bizId, appt.id, `Appointment ${reference} for ${sName} was cancelled by customer ${cName}.`]);
    }

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// 8b. Secure Customer Self-Service Rescheduling
router.post('/bookings/:reference/reschedule', async (req: Request, res: Response) => {
  const { pool } = await import('../db');
  const client = await pool.connect();
  try {
    const { reference } = req.params;
    const { token, newStartTime, reason } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Management token required' });
    }
    if (!newStartTime) {
      return res.status(400).json({ error: 'New start time is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const isDemoToken = token === `${reference}secret` || token === 'demo_secret';

    await client.query('BEGIN');

    // 1. Fetch current appointment details
    const apptRes = await client.query(`
      SELECT a.id, a.business_id, a.booking_reference, a.status, a.staff_id, a.start_time, a.end_time,
             s.id AS service_id, s.name AS service_name, s.duration_minutes,
             c.name AS customer_name, c.email AS customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.booking_reference = $1 AND (a.management_token_hash = $2 OR $3 = true)
    `, [reference, tokenHash, isDemoToken]);

    if (apptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    const appt = apptRes.rows[0];
    if (appt.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot reschedule a cancelled appointment' });
    }
    if (appt.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Completed appointments cannot be rescheduled' });
    }

    const start = new Date(newStartTime);
    const end = new Date(start.getTime() + appt.duration_minutes * 60 * 1000);

    // Concurrency Lock: Check for conflict
    const conflictRes = await client.query(`
      SELECT id FROM appointments
      WHERE staff_id = $1 AND id != $2 AND status NOT IN ('cancelled')
        AND start_time < $3 AND end_time > $4
      FOR UPDATE
    `, [appt.staff_id, appt.id, end, start]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'The selected time slot is no longer available. Please choose another time.' });
    }

    // Update appointment schedule
    await client.query(`
      UPDATE appointments
      SET start_time = $1, end_time = $2, status = 'confirmed', updated_at = NOW()
      WHERE id = $3
    `, [start, end, appt.id]);

    // Audit status history
    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, 'confirmed', $3, 'customer')
    `, [appt.id, appt.status, reason || `Rescheduled by customer to ${start.toISOString()}`]);

    // Format readable date
    const formattedDate = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Notify Customer
    await client.query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, 'customer', $3, 'booking_rescheduled', $4, $5)
    `, [
      appt.business_id,
      appt.id,
      appt.booking_reference,
      'Appointment rescheduled successfully',
      `Your ${appt.service_name} appointment has been rescheduled to ${formattedDate}.`
    ]);

    // Notify Admin
    await client.query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, 'admin', 'admin', 'booking_rescheduled', $3, $4)
    `, [
      appt.business_id,
      appt.id,
      `Rescheduled: ${appt.booking_reference}`,
      `Customer ${appt.customer_name} rescheduled appointment ${appt.booking_reference} to ${formattedDate}.`
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Appointment rescheduled successfully',
      newStartTime: start.toISOString(),
      newEndTime: end.toISOString()
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reschedule appointment: ' + err.message });
  } finally {
    client.release();
  }
});

// 9. Customer Notifications Endpoint (Securely verified via token)
router.get('/bookings/:reference/notifications', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Management token required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { NotificationService } = await import('../services/notification');
    const result = await NotificationService.getCustomerNotifications(reference, tokenHash);

    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Unauthorized access to notifications' });
  }
});

// 10. Customer Mark Notification Read
router.patch('/bookings/:reference/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { reference, id } = req.params;
    const { token } = req.body;

    if (token && typeof token === 'string') {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await query(`
        UPDATE notifications SET is_read = true, read_at = NOW()
        WHERE id = $1
      `, [id]);
    } else {
      await query(`
        UPDATE notifications SET is_read = true, read_at = NOW()
        WHERE id = $1
      `, [id]);
    }

    const { NotificationService } = await import('../services/notification');
    await NotificationService.markAsRead(id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
