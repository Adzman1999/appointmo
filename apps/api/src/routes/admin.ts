import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { seedData } from '../db/seed';

const router = Router();

// 1. Dashboard Metrics (Calculated from actual DB records, never hardcoded)
router.get('/metrics', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
    const businessId = bizRes.rows[0].id;

    // Counts by status
    const statusRes = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
      GROUP BY status
    `, [businessId]);

    // Today's appointments (Manila timezone)
    const todayRes = await query(`
      SELECT COUNT(*)::int AS count
      FROM appointments
      WHERE business_id = $1
        AND start_time >= CURRENT_DATE AT TIME ZONE 'Asia/Manila'
        AND start_time < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Asia/Manila'
        AND status NOT IN ('cancelled')
    `, [businessId]);

    // Total completed revenue
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
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// 2. Appointment List with Filter & Search
router.get('/appointments', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const { status, search, limit = '50', offset = '0' } = req.query;

    const bizRes = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
    const businessId = bizRes.rows[0].id;

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// 3. Update Appointment Status
router.patch('/appointments/:id/status', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const existing = await query('SELECT status FROM appointments WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const prev = existing.rows[0].status;
    await query('UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

    await query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, prev, status, reason || '', req.user?.email || 'admin']);

    res.json({ message: 'Appointment status updated', newStatus: status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// 4. Reset Demo Data (Explicitly authorized demo operation)
router.post('/demo/reset', authenticateJwt, requireRole(['platform_admin', 'business_admin']), async (req: Request, res: Response) => {
  try {
    console.log(`Resetting demo dataset requested by ${req.user?.email}...`);
    await seedData();
    res.json({ message: 'Lumière Beauty Studio demo data has been safely reset to initial deterministic state.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset demo dataset' });
  }
});

export default router;
