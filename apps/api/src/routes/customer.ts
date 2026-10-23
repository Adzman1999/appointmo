import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// GET /api/customer/me - Fetch authenticated customer's own profile and appointments
router.get('/me', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cleanEmail = user.email.trim().toLowerCase();

    // 1. Fetch user record
    const userRes = await query(
      `SELECT id, name, email, phone, role, created_at AS "createdAt"
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const userData = userRes.rows[0];

    // 2. Fetch or guarantee customer profile
    let custRes = await query(
      `SELECT id, name, email, phone, created_at AS "createdAt"
       FROM customers
       WHERE LOWER(email) = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanEmail]
    );

    let customerProfile = custRes.rows[0];

    if (!customerProfile) {
      // Find default business to anchor customer profile if none exists
      const defaultBiz = await query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio' LIMIT 1");
      const defaultBizId = defaultBiz.rows[0]?.id;
      if (defaultBizId) {
        const insCust = await query(
          `INSERT INTO customers (business_id, name, email, phone)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (business_id, email) DO UPDATE SET name = $2, phone = $4
           RETURNING id, name, email, phone, created_at AS "createdAt"`,
          [defaultBizId, userData.name || 'Customer', cleanEmail, userData.phone || '+63 900 000 0000']
        );
        customerProfile = insCust.rows[0];
      }
    }

    // 3. Fetch all appointments booked by this customer (matched by email or customer ID)
    const apptsRes = await query(
      `SELECT 
        a.id, a.booking_reference AS "bookingReference", a.status,
        a.start_time AS "startTime", a.end_time AS "endTime",
        a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
        s.id AS "serviceId", s.name AS "serviceName", s.duration_minutes AS "durationMinutes",
        sp.id AS "staffId", sp.name AS "staffName",
        b.id AS "businessId", b.name AS "businessName", b.slug AS "businessSlug",
        br.id AS "branchId", br.name AS "branchName", br.address AS "branchAddress"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff_profiles sp ON a.staff_id = sp.id
      JOIN businesses b ON a.business_id = b.id
      JOIN branches br ON a.branch_id = br.id
      JOIN customers c ON a.customer_id = c.id
      WHERE LOWER(c.email) = $1
         OR ($2::uuid IS NOT NULL AND a.customer_id = $2::uuid)
      ORDER BY a.start_time DESC`,
      [cleanEmail, customerProfile?.id || null]
    );

    const appointments = apptsRes.rows.map(appt => ({
      ...appt,
      managementToken: `${appt.bookingReference}secret`,
    }));

    const now = new Date();
    const upcoming = appointments.filter(a => 
      (a.status === 'confirmed' || a.status === 'pending') && new Date(a.startTime) > now
    );
    const past = appointments.filter(a => 
      a.status === 'completed' || ((a.status === 'confirmed' || a.status === 'pending') && new Date(a.startTime) <= now)
    );
    const cancelled = appointments.filter(a => a.status === 'cancelled');

    // 4. Notifications
    let notifications: any[] = [];
    if (customerProfile?.id) {
      const notifRes = await query(
        `SELECT id, type, title, message, booking_reference AS "bookingReference", is_read AS "isRead", created_at AS "createdAt"
         FROM notifications
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [customerProfile.id]
      );
      notifications = notifRes.rows;
    }

    res.json({
      customer: {
        id: customerProfile?.id || userData.id,
        name: userData.name || customerProfile?.name || 'Customer Account',
        email: userData.email,
        phone: userData.phone || customerProfile?.phone || '',
        createdAt: userData.createdAt || customerProfile?.createdAt,
      },
      appointments,
      upcoming,
      past,
      cancelled,
      notifications,
    });
  } catch (err: any) {
    console.error('Failed to get customer profile:', err);
    res.status(500).json({ error: 'Failed to retrieve customer account details: ' + (err.message || 'Server error') });
  }
});

export default router;
