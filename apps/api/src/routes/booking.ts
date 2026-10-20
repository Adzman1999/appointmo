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
    const bizRes = await query(`
      SELECT b.id, b.name, b.slug, b.description, b.currency, b.timezone
      FROM businesses b
      WHERE b.slug = 'lumiere-beauty-studio'
      LIMIT 1
    `);

    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demo business not found' });
    }

    const business = bizRes.rows[0];
    const branchesRes = await query('SELECT id, name, address, city, phone FROM branches WHERE business_id = $1', [business.id]);

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
    const sRes = await query(`
      SELECT s.id, s.name, s.description, s.duration_minutes AS "durationMinutes", s.price, s.category
      FROM services s
      JOIN businesses b ON s.business_id = b.id
      WHERE b.slug = 'lumiere-beauty-studio' AND s.is_active = true
      ORDER BY s.price ASC
    `);

    res.json({ services: sRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// 3. Get Staff Eligible for a Service (or all staff)
router.get('/staff', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.query;

    let sql = `
      SELECT DISTINCT sp.id, sp.name, sp.bio, sp.avatar_url AS "avatarUrl"
      FROM staff_profiles sp
      JOIN businesses b ON sp.business_id = b.id
    `;
    const params: any[] = [];

    if (serviceId && typeof serviceId === 'string') {
      sql += ` JOIN staff_services ss ON sp.id = ss.staff_id WHERE ss.service_id = $1 AND sp.is_active = true`;
      params.push(serviceId);
    } else {
      sql += ` WHERE b.slug = 'lumiere-beauty-studio' AND sp.is_active = true`;
    }

    const staffRes = await query(sql, params);
    res.json({ staff: staffRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve staff' });
  }
});

// 4. Get Available Appointment Time Slots (Real calculation from DB rules)
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { serviceId, date, staffId } = req.query;
    if (!serviceId || !date) {
      return res.status(400).json({ error: 'serviceId and date (YYYY-MM-DD) are required' });
    }

    const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
    const businessId = bizRes.rows[0].id;

    const slots = await AvailabilityService.getAvailableSlots(
      businessId,
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

    const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
    const businessId = bizRes.rows[0].id;

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
      WHERE a.booking_reference = $1 AND a.management_token_hash = $2
    `, [reference, tokenHash]);

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

    const apptRes = await query(
      'SELECT id, status FROM appointments WHERE booking_reference = $1 AND management_token_hash = $2',
      [reference, tokenHash]
    );

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    const appt = apptRes.rows[0];
    if (appt.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    await query(
      'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3',
      ['cancelled', reason || 'Customer requested cancellation via portal', appt.id]
    );

    await query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, 'cancelled', $3, 'customer')
    `, [appt.id, appt.status, reason || 'Customer cancellation']);

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router;
