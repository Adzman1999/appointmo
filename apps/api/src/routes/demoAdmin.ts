import { Router, Request, Response } from 'express';
import { query, pool } from '../db';
import { seedData } from '../db/seed';
import { NotificationService } from '../services/notification';
import { AvailabilityService } from '../services/availability';

const router = Router();

// Dedicated Demo Isolation Scope: Can operate against requested business slug or default to Lumière
async function getDemoBusinessId(req?: Request): Promise<string> {
  const querySlug = req?.query?.slug as string | undefined;
  const targetSlug = querySlug && querySlug.trim() ? querySlug.trim() : 'lumiere-beauty-studio';

  const bizRes = await query("SELECT id FROM businesses WHERE slug = $1", [targetSlug]);
  if (bizRes.rows.length === 0) {
    // Fallback to first available business
    const anyBiz = await query("SELECT id FROM businesses LIMIT 1");
    if (anyBiz.rows.length === 0) {
      throw new Error('Synthetic demo business not initialized');
    }
    return anyBiz.rows[0].id;
  }
  return bizRes.rows[0].id;
}

// 0. Get current active business info and all switchable demo businesses
router.get('/businesses', async (_req: Request, res: Response) => {
  try {
    const listRes = await query(`
      SELECT b.id, b.name, b.slug, b.category, b.description, b.logo_url AS "logoUrl",
             COUNT(DISTINCT br.id)::int AS "branchCount",
             COUNT(DISTINCT s.id)::int AS "serviceCount",
             COUNT(DISTINCT sp.id)::int AS "staffCount"
      FROM businesses b
      LEFT JOIN branches br ON b.id = br.business_id AND br.is_active = true
      LEFT JOIN services s ON b.id = s.business_id AND s.is_active = true
      LEFT JOIN staff_profiles sp ON b.id = sp.business_id AND sp.is_active = true
      GROUP BY b.id
      ORDER BY b.name ASC
    `);

    res.json({ businesses: listRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch demo businesses' });
  }
});

// 0b. Create New Fictional Demo Business from Admin Studio Wizard
router.post('/create-business', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, category, description, currency, timezone, logoUrl, branchName, branchAddress, branchCity, branchPhone } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Business name and category are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    await client.query('BEGIN');

    // 1. Create Business
    const bRes = await client.query(`
      INSERT INTO businesses (name, slug, description, category, currency, timezone, logo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, slug, category, description, logo_url AS "logoUrl"
    `, [name, slug, description || `Demo studio offering ${category}`, currency || 'PHP', timezone || 'Asia/Manila', logoUrl || null]);
    const newBiz = bRes.rows[0];

    // 2. Create Initial Branch
    const brRes = await client.query(`
      INSERT INTO branches (business_id, name, address, city, phone, location_description)
      VALUES ($1, $2, $3, $4, $5, 'Primary Demonstration Branch')
      RETURNING id, name
    `, [newBiz.id, branchName || `${name} Main Branch`, branchAddress || '101 Demonstration Ave', branchCity || 'Quezon City', branchPhone || '+63 2 8999 0001']);

    // 3. Create default service
    const sRes = await client.query(`
      INSERT INTO services (business_id, name, description, duration_minutes, price, category)
      VALUES ($1, 'Standard Consultation', 'Initial comprehensive consultation and assessment session.', 45, 1000, 'Consultation')
      RETURNING id
    `, [newBiz.id]);

    // 4. Create default staff
    const spRes = await client.query(`
      INSERT INTO staff_profiles (business_id, name, bio)
      VALUES ($1, 'Lead Practitioner', 'Experienced practitioner and service specialist.')
      RETURNING id
    `, [newBiz.id]);

    // Link staff service
    await client.query(`INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2)`, [spRes.rows[0].id, sRes.rows[0].id]);

    // Set working hours Mon-Sat
    for (let day = 1; day <= 6; day++) {
      await client.query(`
        INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
        VALUES ($1, $2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', true)
      `, [spRes.rows[0].id, day]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Demo business created successfully!',
      business: newBiz,
      branch: brRes.rows[0]
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create business: ' + err.message });
  } finally {
    client.release();
  }
});

// 1. Live Calculated Dashboard Metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req);

    const statusRes = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
      GROUP BY status
    `, [businessId]);

    const todayRes = await query(`
      SELECT COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
        AND start_time >= CURRENT_DATE AT TIME ZONE 'Asia/Manila'
        AND start_time < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Asia/Manila'
        AND status NOT IN ('cancelled')
    `, [businessId]);

    const revRes = await query(`
      SELECT COALESCE(SUM(price_snapshot), 0)::numeric AS "totalRevenue"
      FROM appointments
      WHERE business_id = $1 AND status = 'completed'
    `, [businessId]);

    const popularServicesRes = await query(`
      SELECT s.name, COUNT(a.id)::int AS bookings, SUM(a.price_snapshot)::numeric AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.business_id = $1 AND a.status != 'cancelled'
      GROUP BY s.name
      ORDER BY bookings DESC
      LIMIT 5
    `, [businessId]);

    const statusCounts: Record<string, number> = {
      completed: 0,
      confirmed: 0,
      cancelled: 0,
      pending: 0,
    };
    for (const row of statusRes.rows) {
      statusCounts[row.status] = row.count;
    }

    res.json({
      metrics: {
        todayCount: todayRes.rows[0].count,
        upcomingCount: statusCounts.confirmed || 0,
        completedCount: statusCounts.completed || 0,
        cancelledCount: statusCounts.cancelled || 0,
        totalRevenue: revRes.rows[0].totalRevenue,
        servicePopularity: popularServicesRes.rows,
        statusCounts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch demo dashboard metrics: ' + err.message });
  }
});

// 2. Appointment List with Filter, Search & Newest First Sorting (created_at DESC, id DESC)
router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const { status, search, limit = '50', offset = '0', sort = 'newest' } = req.query;
    const businessId = await getDemoBusinessId(req);

    let sql = `
      SELECT 
        a.id, a.booking_reference AS "bookingReference", a.status,
        a.start_time AS "startTime", a.end_time AS "endTime",
        a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
        s.id AS "serviceId", s.name AS "serviceName", s.duration_minutes AS "durationMinutes",
        sp.id AS "staffId", sp.name AS "staffName",
        c.name AS "customerName", c.email AS "customerEmail", c.phone AS "customerPhone"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff_profiles sp ON a.staff_id = sp.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.business_id = $1
    `;
    const params: any[] = [businessId];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    if (search && typeof search === 'string') {
      params.push(`%${search}%`);
      sql += ` AND (c.name ILIKE $${params.length} OR a.booking_reference ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
    }

    if (sort === 'scheduled') {
      sql += ' ORDER BY a.start_time ASC, a.id DESC';
    } else {
      // Default: Newest created bookings first, stable secondary sort
      sql += ' ORDER BY a.created_at DESC, a.id DESC';
    }

    sql += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const result = await query(sql, params);
    res.json({ appointments: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch demo appointments' });
  }
});

// 3. Get Single Appointment Details with Full Audit History
router.get('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = await getDemoBusinessId(req);

    const apptRes = await query(`
      SELECT 
        a.id, a.booking_reference AS "bookingReference", a.status,
        a.start_time AS "startTime", a.end_time AS "endTime",
        a.price_snapshot AS "price", a.currency, a.notes, a.cancellation_reason AS "cancellationReason",
        a.created_at AS "createdAt", a.updated_at AS "updatedAt",
        s.id AS "serviceId", s.name AS "serviceName", s.duration_minutes AS "durationMinutes", s.category,
        sp.id AS "staffId", sp.name AS "staffName",
        c.name AS "customerName", c.email AS "customerEmail", c.phone AS "customerPhone"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff_profiles sp ON a.staff_id = sp.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.business_id = $2
    `, [id, businessId]);

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const historyRes = await query(`
      SELECT id, previous_status AS "previousStatus", new_status AS "newStatus", reason, changed_by AS "changedBy", created_at AS "createdAt"
      FROM appointment_status_history
      WHERE appointment_id = $1
      ORDER BY created_at ASC
    `, [id]);

    res.json({
      appointment: apptRes.rows[0],
      history: historyRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch appointment details' });
  }
});

// 4. Update Appointment Status (Confirm, Complete, Cancel) with Two-Way Notifications
router.patch('/appointments/:id/status', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const businessId = await getDemoBusinessId();

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status transition: ${status}` });
    }

    await client.query('BEGIN');

    const existingRes = await client.query(`
      SELECT a.id, a.status, a.booking_reference, a.start_time, s.name AS service_name, c.name AS customer_name, c.email AS customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.business_id = $2
    `, [id, businessId]);

    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const appt = existingRes.rows[0];
    const prevStatus = appt.status;

    if (prevStatus === status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Appointment is already in ${status} status` });
    }

    await client.query(
      'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3 AND business_id = $4',
      [status, status === 'cancelled' ? (reason || 'Cancelled by admin') : null, id, businessId]
    );

    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $3, $4, 'admin')
    `, [id, prevStatus, status, reason || `Status updated to ${status} by admin`]);

    // Send customer notification
    let custTitle = `Appointment update: ${status.toUpperCase()}`;
    let custMsg = `Your appointment for ${appt.service_name} status was updated to ${status}.`;

    if (status === 'confirmed') {
      custTitle = 'Your appointment has been confirmed!';
      custMsg = `Great news! The studio has approved and confirmed your appointment for ${appt.service_name}.`;
    } else if (status === 'cancelled') {
      custTitle = 'Your appointment has been cancelled';
      custMsg = `Your appointment for ${appt.service_name} was cancelled. ${reason ? `Reason: ${reason}` : ''}`;
    }

    await client.query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, 'customer', $3, $4, $5, $6)
    `, [
      businessId,
      id,
      appt.booking_reference,
      `booking_${status}`,
      custTitle,
      custMsg,
    ]);

    await client.query('COMMIT');

    res.json({ message: `Appointment status updated from ${prevStatus} to ${status}`, newStatus: status });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update demo appointment status' });
  } finally {
    client.release();
  }
});

// 5. Safe Rescheduling Endpoint with Concurrency Check
router.post('/appointments/:id/reschedule', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { newStartTime, newStaffId, reason } = req.body;
    const businessId = await getDemoBusinessId();

    if (!newStartTime) {
      return res.status(400).json({ error: 'New start time is required for rescheduling' });
    }

    await client.query('BEGIN');

    // 1. Fetch current appointment details with service info
    const apptRes = await client.query(`
      SELECT a.id, a.booking_reference, a.status, a.staff_id, a.start_time, a.end_time,
             s.id AS service_id, s.name AS service_name, s.duration_minutes,
             c.name AS customer_name, c.email AS customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.business_id = $2
    `, [id, businessId]);

    if (apptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appt = apptRes.rows[0];
    const targetStaffId = newStaffId || appt.staff_id;

    // Verify staff is qualified
    const eligRes = await client.query(`
      SELECT 1 FROM staff_services
      WHERE staff_id = $1 AND service_id = $2
    `, [targetStaffId, appt.service_id]);

    if (eligRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected staff member is not qualified for this service' });
    }

    const start = new Date(newStartTime);
    const end = new Date(start.getTime() + appt.duration_minutes * 60 * 1000);

    // Concurrency Lock: Check for conflict (excluding this appointment itself)
    const conflictRes = await client.query(`
      SELECT id FROM appointments
      WHERE staff_id = $1 AND id != $2 AND status NOT IN ('cancelled')
        AND start_time < $3 AND end_time > $4
      FOR UPDATE
    `, [targetStaffId, id, end, start]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'The selected rescheduled time slot conflicts with an existing booking. Please choose another time.' });
    }

    // 2. Perform reschedule update
    await client.query(`
      UPDATE appointments
      SET start_time = $1, end_time = $2, staff_id = $3, status = 'confirmed', updated_at = NOW()
      WHERE id = $4 AND business_id = $5
    `, [start, end, targetStaffId, id, businessId]);

    // 3. Add History
    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, 'confirmed', $3, 'admin')
    `, [id, appt.status, reason || `Rescheduled to ${start.toISOString()} by admin`]);

    // 4. Send Two-Way Notifications
    const formattedDate = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Customer Notification
    await client.query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, 'customer', $3, 'booking_rescheduled', $4, $5)
    `, [
      businessId,
      id,
      appt.booking_reference,
      'Your appointment was rescheduled',
      `Your ${appt.service_name} appointment has been rescheduled to ${formattedDate}. Open your booking details to review.`
    ]);

    // Admin Notification
    await client.query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, 'admin', 'admin', 'booking_rescheduled', $3, $4)
    `, [
      businessId,
      id,
      `Rescheduled: ${appt.booking_reference}`,
      `Appointment ${appt.booking_reference} (${appt.customer_name}) was rescheduled to ${formattedDate}.`
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Appointment rescheduled successfully',
      newStartTime: start.toISOString(),
      newEndTime: end.toISOString(),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reschedule appointment: ' + err.message });
  } finally {
    client.release();
  }
});

// 6. Safe Staff Reassignment Endpoint
router.post('/appointments/:id/reassign-staff', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    const businessId = await getDemoBusinessId();

    if (!staffId) {
      return res.status(400).json({ error: 'Target staff member is required' });
    }

    await client.query('BEGIN');

    const apptRes = await client.query(`
      SELECT a.id, a.service_id, a.start_time, a.end_time, a.status, sp.name AS current_staff_name
      FROM appointments a
      JOIN staff_profiles sp ON a.staff_id = sp.id
      WHERE a.id = $1 AND a.business_id = $2
    `, [id, businessId]);

    if (apptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appt = apptRes.rows[0];

    // Check target staff qualifications
    const qualRes = await client.query(`
      SELECT sp.name FROM staff_profiles sp
      JOIN staff_services ss ON sp.id = ss.staff_id
      WHERE sp.id = $1 AND ss.service_id = $2 AND sp.is_active = true
    `, [staffId, appt.service_id]);

    if (qualRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected staff member is not qualified for this service' });
    }

    const targetStaffName = qualRes.rows[0].name;

    // Check conflict
    const conflictRes = await client.query(`
      SELECT id FROM appointments
      WHERE staff_id = $1 AND id != $2 AND status NOT IN ('cancelled')
        AND start_time < $3 AND end_time > $4
      FOR UPDATE
    `, [staffId, id, appt.end_time, appt.start_time]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${targetStaffName} already has an appointment during this time slot` });
    }

    await client.query(
      'UPDATE appointments SET staff_id = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3',
      [staffId, id, businessId]
    );

    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $2, $3, 'admin')
    `, [id, appt.status, `Reassigned specialist from ${appt.current_staff_name} to ${targetStaffName}`]);

    await client.query('COMMIT');

    res.json({ message: `Staff specialist updated to ${targetStaffName}`, staffName: targetStaffName });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reassign staff' });
  } finally {
    client.release();
  }
});

// 7. Admin Notifications Feed (Live polling & persistence)
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId();
    const data = await NotificationService.getAdminNotifications(businessId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin notifications' });
  }
});

// 8. Mark Single Notification as Read
router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await NotificationService.markAsRead(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// 9. Mark All Admin Notifications as Read
router.post('/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId();
    await NotificationService.markAllAsRead('admin', 'admin', businessId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// 10. Safe Demo Dataset Reset
router.post('/reset', async (req: Request, res: Response) => {
  try {
    console.log('Resetting synthetic demo dataset (Lumière Beauty Studio)...');
    await seedData();
    res.json({
      message: 'Synthetic demo data successfully restored to original clean state (125 bookings, 6 services, 3 staff).',
    });
  } catch (err: any) {
    console.error('Demo reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo dataset' });
  }
});

// 11. Services and Working Hours Overview for Admin Demo
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req);

    const bizRes = await query('SELECT id, name, slug, category, description, currency, timezone, logo_url AS "logoUrl" FROM businesses WHERE id = $1', [businessId]);
    const branchesRes = await query('SELECT id, name, address, city, phone, location_description AS "locationDescription" FROM branches WHERE business_id = $1 AND is_active = true', [businessId]);
    const servicesRes = await query('SELECT id, name, description, duration_minutes AS "durationMinutes", price, category FROM services WHERE business_id = $1 ORDER BY price ASC', [businessId]);
    const staffRes = await query('SELECT id, name, bio FROM staff_profiles WHERE business_id = $1', [businessId]);
    const hoursRes = await query(`
      SELECT sp.name AS "staffName", swh.day_of_week AS "dayOfWeek", swh.start_time AS "startTime", swh.end_time AS "endTime", swh.is_working AS "isWorking"
      FROM staff_working_hours swh
      JOIN staff_profiles sp ON swh.staff_id = sp.id
      WHERE sp.business_id = $1
      ORDER BY swh.day_of_week ASC
    `, [businessId]);

    res.json({
      business: bizRes.rows[0],
      branches: branchesRes.rows,
      services: servicesRes.rows,
      staff: staffRes.rows,
      workingHours: hoursRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings overview' });
  }
});

export default router;
