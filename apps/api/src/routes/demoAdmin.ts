import { Router, Request, Response } from 'express';
import { query } from '../db';
import { seedData } from '../db/seed';

const router = Router();

// Dedicated Demo Isolation Scope: Only operates against the synthetic demo business
async function getDemoBusinessId(): Promise<string> {
  const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
  if (bizRes.rows.length === 0) {
    throw new Error('Synthetic demo business not initialized');
  }
  return bizRes.rows[0].id;
}

// 1. Live Calculated Dashboard Metrics (From real persisted demo records, zero hardcoding)
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId();

    // Counts by status
    const statusRes = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
      GROUP BY status
    `, [businessId]);

    // Today's appointments (Asia/Manila timezone)
    const todayRes = await query(`
      SELECT COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
        AND start_time >= CURRENT_DATE AT TIME ZONE 'Asia/Manila'
        AND start_time < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Asia/Manila'
        AND status NOT IN ('cancelled')
    `, [businessId]);

    // Total completed revenue from synthetic bookings
    const revRes = await query(`
      SELECT COALESCE(SUM(price_snapshot), 0)::numeric AS "totalRevenue"
      FROM appointments
      WHERE business_id = $1 AND status = 'completed'
    `, [businessId]);

    // Service Popularity
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

// 2. Appointment List with Filter & Search (Public Admin Demo)
router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const { status, search, limit = '50', offset = '0' } = req.query;
    const businessId = await getDemoBusinessId();

    let sql = `
      SELECT 
        a.id, a.booking_reference AS "bookingReference", a.status,
        a.start_time AS "startTime", a.end_time AS "endTime",
        a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
        s.name AS "serviceName", sp.name AS "staffName",
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

    sql += ' ORDER BY a.start_time DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const result = await query(sql, params);
    res.json({ appointments: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch demo appointments' });
  }
});

// 3. Update Appointment Status (Approve / Confirm / Cancel / Complete)
router.patch('/appointments/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const businessId = await getDemoBusinessId();

    // Verify appointment belongs strictly to the demo business
    const existing = await query('SELECT status FROM appointments WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const prev = existing.rows[0].status;
    await query('UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3', [status, id, businessId]);

    await query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $3, $4, 'demo_admin_visitor')
    `, [id, prev, status, reason || 'Status updated via interactive Admin Demo']);

    res.json({ message: `Appointment status updated from ${prev} to ${status}`, newStatus: status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update demo appointment status' });
  }
});

// 4. Safe Demo Dataset Reset (Resets ONLY synthetic demo data)
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

// 5. Services and Working Hours Overview for Admin Demo
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId();

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
      services: servicesRes.rows,
      staff: staffRes.rows,
      workingHours: hoursRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings overview' });
  }
});

export default router;
