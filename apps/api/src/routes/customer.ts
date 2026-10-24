import { Router, Request, Response } from 'express';
import { query } from '../db';
import { getCustomerChangeCutoffHours } from '../services/bookingPolicies';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// GET /api/customer/me - Fetch authenticated customer's own profile and appointments
router.get('/me', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.email || !user.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cleanEmail = user.email.trim().toLowerCase();

    // 1. Fetch user record
    const userRes = await query(
      `SELECT id, name, email, phone, role, created_at AS "createdAt"
       FROM users
       WHERE id = $1 AND LOWER(email) = $2 AND role = 'customer'
       LIMIT 1`,
      [user.userId, cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(403).json({ error: 'Sign in with a customer account to view your appointments.' });
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
      const defaultBiz = await query("SELECT id FROM businesses WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1");
      const defaultBizId = defaultBiz.rows[0]?.id || (await query("SELECT id FROM businesses LIMIT 1")).rows[0]?.id;
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
        a.recipient_name AS "recipientName", a.recipient_email AS "recipientEmail",
        a.recipient_phone AS "recipientPhone",
        a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
        s.id AS "serviceId", s.name AS "serviceName", s.duration_minutes AS "durationMinutes",
        sp.id AS "staffId", sp.name AS "staffName",
        b.id AS "businessId", b.name AS "businessName", b.slug AS "businessSlug",
        b.booking_policies AS "bookingPolicies",
        br.id AS "branchId", br.name AS "branchName", br.address AS "branchAddress",
        r.rating AS "storeRating", r.staff_rating AS "staffRating", r.comment AS "reviewComment"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN staff_profiles sp ON a.staff_id = sp.id
      JOIN businesses b ON a.business_id = b.id
      JOIN branches br ON a.branch_id = br.id
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN reviews r ON r.appointment_id = a.id AND r.user_id = $1
      WHERE a.booked_by_user_id = $1
         OR (a.booked_by_user_id IS NULL AND a.is_guest_booking = false AND LOWER(c.email) = $2)
         OR ($3::uuid IS NOT NULL AND a.customer_id = $3::uuid AND a.is_guest_booking = false)
      ORDER BY a.start_time DESC`,
      [userData.id, cleanEmail, customerProfile?.id || null]
    );

    const appointments = apptsRes.rows.map(appt => ({
      ...appt,
      customerChangeCutoffHours: getCustomerChangeCutoffHours(appt.bookingPolicies),
      bookingPolicies: undefined,
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

    // 4. Notifications (Customer notifications matched by customer identifier, email, or appointment ID)
    const notifRes = await query(
      `SELECT n.id, n.appointment_id AS "appointmentId", n.type, n.title, n.message,
              n.is_read AS "isRead", n.created_at AS "createdAt",
              a.booking_reference AS "bookingReference",
              s.name AS "serviceName"
       FROM notifications n
       LEFT JOIN appointments a ON n.appointment_id = a.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE n.recipient_type = 'customer'
         AND (
           (n.appointment_id IS NOT NULL AND n.appointment_id = ANY($2::uuid[]))
           OR (n.appointment_id IS NULL AND LOWER(n.recipient_identifier) = $1)
         )
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [cleanEmail, appointments.map(a => a.id).filter(Boolean)]
    );
    const notifications = notifRes.rows;

    const unreadCount = notifications.filter(n => !n.isRead).length;

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
      unreadCount,
    });
  } catch (err: any) {
    console.error('Failed to get customer profile:', err);
    res.status(500).json({ error: 'Failed to retrieve customer account details: ' + (err.message || 'Server error') });
  }
});

// POST /api/customer/reviews - Rate the store and specialist for a completed booking
router.post('/reviews', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.userId || !user.email) {
      return res.status(401).json({ error: 'Sign in with your customer account to leave a review.' });
    }

    const storeRating = Number(req.body.storeRating);
    const staffRating = Number(req.body.staffRating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : '';
    const appointmentId = typeof req.body.appointmentId === 'string' ? req.body.appointmentId : '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointmentId);
    if (!isUuid || !Number.isInteger(storeRating) || storeRating < 1 || storeRating > 5 ||
        !Number.isInteger(staffRating) || staffRating < 1 || staffRating > 5) {
      return res.status(400).json({ error: 'Choose a 1 to 5 star rating for both the store and specialist.' });
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const customerUserRes = await query(
      `SELECT id, name FROM users WHERE id = $1 AND LOWER(email) = $2 AND role = 'customer' LIMIT 1`,
      [user.userId, cleanEmail]
    );
    if (customerUserRes.rows.length === 0) {
      return res.status(403).json({ error: 'Sign in with a customer account to leave a review.' });
    }

    const appointmentRes = await query(
      `SELECT a.id, a.business_id AS "businessId", a.branch_id AS "branchId",
              a.service_id AS "serviceId", a.staff_id AS "staffId", c.id AS "customerId",
              COALESCE(NULLIF(c.name, ''), $3) AS "customerName"
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       WHERE a.id = $1
         AND a.status = 'completed'
         AND (
           a.booked_by_user_id = $2
           OR (a.booked_by_user_id IS NULL AND a.is_guest_booking = false AND LOWER(c.email) = $4)
         )
       LIMIT 1`,
      [appointmentId, customerUserRes.rows[0].id, customerUserRes.rows[0].name, cleanEmail]
    );
    if (appointmentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Only completed appointments booked by your account can be reviewed.' });
    }

    const appointment = appointmentRes.rows[0];
    const reviewRes = await query(
      `INSERT INTO reviews (
         business_id, branch_id, service_id, appointment_id, customer_name, rating,
         comment, user_id, customer_id, staff_id, staff_rating
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (appointment_id) WHERE appointment_id IS NOT NULL AND user_id IS NOT NULL DO NOTHING
       RETURNING id, rating AS "storeRating", staff_rating AS "staffRating", comment, created_at AS "createdAt"`,
      [
        appointment.businessId, appointment.branchId, appointment.serviceId, appointment.id,
        appointment.customerName, storeRating, comment || null, customerUserRes.rows[0].id,
        appointment.customerId, appointment.staffId, staffRating,
      ]
    );
    if (reviewRes.rows.length === 0) {
      return res.status(409).json({ error: 'This appointment has already been reviewed.' });
    }

    res.status(201).json({ review: reviewRes.rows[0] });
  } catch (err: any) {
    console.error('Failed to submit customer review:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// PATCH /api/customer/notifications/:id/read - Mark customer notification as read
router.patch('/notifications/:id/read', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query("UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/customer/notifications/mark-all-read - Mark all customer notifications as read
router.post('/notifications/mark-all-read', authenticateJwt, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const cleanEmail = user.email.trim().toLowerCase();

    await query(`
      UPDATE notifications n
      SET is_read = true, read_at = NOW()
      WHERE n.recipient_type = 'customer'
        AND n.is_read = false
        AND (
          (n.appointment_id IS NULL AND LOWER(n.recipient_identifier) = $1)
          OR n.appointment_id IN (
            SELECT a.id FROM appointments a
            WHERE a.booked_by_user_id = $2
              OR (a.booked_by_user_id IS NULL AND a.is_guest_booking = false AND a.customer_id IN (
                SELECT id FROM customers WHERE LOWER(email) = $1
              ))
          )
        )
    `, [cleanEmail, user.userId]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;
