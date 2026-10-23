import { Router, Request, Response } from 'express';
import { query, pool } from '../db';
import { seedData } from '../db/seed';
import { NotificationService } from '../services/notification';
import { AvailabilityService } from '../services/availability';
import { EmailService } from '../services/email';

const router = Router();

// Dedicated Demo Isolation Scope: Can operate against requested business slug or default to Lumière
async function getDemoBusinessId(req?: Request, allowPending: boolean = true): Promise<string> {
  const querySlug = (req?.query?.slug as string | undefined) || (req?.body?.slug as string | undefined);
  const targetSlug = querySlug && querySlug.trim() ? querySlug.trim() : 'lumiere-beauty-studio';

  const bizRes = await query("SELECT id, status FROM businesses WHERE slug = $1", [targetSlug]);
  if (bizRes.rows.length === 0) {
    // Fallback to first available approved business
    const anyBiz = await query("SELECT id FROM businesses WHERE status = 'approved' LIMIT 1");
    if (anyBiz.rows.length === 0) {
      throw new Error('Synthetic demo business not initialized');
    }
    return anyBiz.rows[0].id;
  }

  const biz = bizRes.rows[0];
  if (!allowPending && biz.status === 'pending') {
    throw new Error('This store is currently pending approval. Management actions and edits are locked until approved.');
  }
  if (biz.status === 'rejected') {
    throw new Error('This store registration was rejected by the administrator.');
  }

  return biz.id;
}

// 0. Get current active business info and all switchable demo businesses
router.get('/businesses', async (req: Request, res: Response) => {
  try {
    const querySlug = req.query.slug as string | undefined;
    const listRes = await query(`
      SELECT b.id, b.name, b.slug, b.category, b.description, b.logo_url AS "logoUrl",
             b.phone, b.email, b.address, b.city, b.opening_hours AS "openingHours",
             b.website, b.instagram, COALESCE(b.social_handle, b.instagram) AS "socialHandle", b.tagline, b.status
      FROM businesses b
      WHERE b.status = 'approved' OR ($1::text IS NOT NULL AND b.slug = $1::text)
      ORDER BY b.name ASC
    `, [querySlug || null]);

    res.json({ businesses: listRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch demo businesses' });
  }
});

// 0c. Customer Portal Demo Helper: Get Active Demo Booking for Instant Management
router.get('/demo-active-booking', async (_req: Request, res: Response) => {
  try {
    // 1. Check for most recently confirmed upcoming appointment
    const upcoming = await query(`
      SELECT a.booking_reference AS "bookingReference",
             s.name AS "serviceName",
             c.id AS "customerId",
             c.name AS "customerName",
             c.email AS "customerEmail",
             c.phone AS "customerPhone",
             a.start_time AS "startTime",
             b.name AS "businessName"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      JOIN businesses b ON a.business_id = b.id
      WHERE a.status = 'confirmed' AND a.start_time > NOW()
      ORDER BY a.created_at DESC, a.start_time ASC
      LIMIT 1
    `);

    if (upcoming.rows.length > 0) {
      const row = upcoming.rows[0];
      // Synthetic demo seed tokens are reference + 'secret'
      const demoToken = `${row.bookingReference}secret`;
      return res.json({
        bookingReference: row.bookingReference,
        token: demoToken,
        serviceName: row.serviceName,
        customerId: row.customerId,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        businessName: row.businessName,
      });
    }

    // 2. Fallback to any active appointment
    const anyAppt = await query(`
      SELECT a.booking_reference AS "bookingReference",
             s.name AS "serviceName",
             c.id AS "customerId",
             c.name AS "customerName",
             c.email AS "customerEmail",
             c.phone AS "customerPhone",
             a.start_time AS "startTime",
             b.name AS "businessName"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      JOIN businesses b ON a.business_id = b.id
      WHERE a.status != 'cancelled'
      ORDER BY a.created_at DESC
      LIMIT 1
    `);

    if (anyAppt.rows.length > 0) {
      const row = anyAppt.rows[0];
      return res.json({
        bookingReference: row.bookingReference,
        token: `${row.bookingReference}secret`,
        serviceName: row.serviceName,
        customerId: row.customerId,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        businessName: row.businessName,
      });
    }

    res.status(404).json({ error: 'No demo appointments available' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to find active demo booking' });
  }
});

// 0d. Customer Portal Demo Dashboard: Get all appointments & history for a customer
router.get('/customer-portal', async (req: Request, res: Response) => {
  try {
    const { customerId, email } = req.query;

    let targetCustId = customerId as string | undefined;

    if (!targetCustId && email) {
      const custRes = await query("SELECT id FROM customers WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1", [String(email).trim()]);
      if (custRes.rows.length > 0) {
        targetCustId = custRes.rows[0].id;
      }
    }

    // If still no target customer, pick default demo customer with active upcoming bookings
    if (!targetCustId) {
      const pickCust = await query(`
        SELECT c.id FROM customers c
        JOIN appointments a ON c.id = a.customer_id
        WHERE a.status = 'confirmed' AND a.start_time > NOW()
        ORDER BY a.start_time ASC
        LIMIT 1
      `);
      if (pickCust.rows.length > 0) {
        targetCustId = pickCust.rows[0].id;
      } else {
        const fallbackCust = await query("SELECT id FROM customers LIMIT 1");
        if (fallbackCust.rows.length > 0) {
          targetCustId = fallbackCust.rows[0].id;
        }
      }
    }

    if (!targetCustId) {
      return res.status(404).json({ error: 'No customer account found' });
    }

    // 1. Get customer details
    const custDetails = await query(
      "SELECT id, name, email, phone, created_at AS \"createdAt\" FROM customers WHERE id = $1",
      [targetCustId]
    );

    if (custDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = custDetails.rows[0];

    // 2. Get customer's appointments across all businesses matching either customer ID or email
    const apptsRes = await query(`
      SELECT 
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
      WHERE a.customer_id = $1 OR LOWER(c.email) = LOWER($2)
      ORDER BY a.created_at DESC, a.id DESC
    `, [targetCustId, customer.email]);

    // Format appointments and attach demo management tokens
    const appointments = apptsRes.rows.map(appt => ({
      ...appt,
      managementToken: `${appt.bookingReference}secret`
    }));

    // Categorize: upcoming includes both 'confirmed' and 'pending' bookings scheduled in future
    const upcoming = appointments.filter(a => (a.status === 'confirmed' || a.status === 'pending') && new Date(a.startTime) > new Date());
    const past = appointments.filter(a => a.status === 'completed' || (new Date(a.startTime) <= new Date() && a.status !== 'cancelled' && a.status !== 'pending'));
    const cancelled = appointments.filter(a => a.status === 'cancelled');

    // 3. Customer Notifications across all bookings of this customer
    const notifsRes = await query(`
      SELECT n.id, n.type, n.title, n.message, n.is_read AS "isRead", n.created_at AS "createdAt",
             a.booking_reference AS "bookingReference"
      FROM notifications n
      JOIN appointments a ON n.appointment_id = a.id
      JOIN customers c ON a.customer_id = c.id
      WHERE (a.customer_id = $1 OR LOWER(c.email) = LOWER($2)) AND n.recipient_type = 'customer'
      ORDER BY n.created_at DESC
      LIMIT 20
    `, [targetCustId, customer.email]);

    res.json({
      customer,
      summary: {
        totalBookings: appointments.length,
        upcomingCount: upcoming.length,
        pastCount: past.length,
        cancelledCount: cancelled.length,
      },
      appointments,
      upcoming,
      past,
      cancelled,
      notifications: notifsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load customer portal: ' + err.message });
  }
});

// 0b. Create New Fictional Demo Business from Admin Studio Wizard
router.post('/create-business', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { 
      name, category, description, currency, timezone, logoUrl, 
      tagline, phone, email, address, city, openingHours, website, instagram, socialHandle,
      latitude, longitude,
      ownerName, ownerEmail, ownerPassword
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Business name and category are required' });
    }

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const finalCity = city?.trim() || 'Quezon City';
    const finalPhone = phone?.trim() || '+63 2 8999 0001';
    const finalAddress = address?.trim() || `101 Commercial Ave, ${finalCity}`;
    const finalOpeningHours = openingHours?.trim() || '9:00 AM - 6:00 PM';
    const finalSocMed = (socialHandle || instagram)?.trim() || null;
    const finalOwnerEmail = (ownerEmail || email)?.trim().toLowerCase() || null;
    const finalOwnerName = (ownerName || trimmedName).trim();

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    await client.query('BEGIN');

    // 1. Create Business / Store Record with all store details (status pending)
    const bRes = await client.query(`
      INSERT INTO businesses (
        name, slug, description, category, currency, timezone, logo_url,
        tagline, phone, email, address, city, opening_hours, website, instagram, social_handle, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending')
      RETURNING id, name, slug, category, description, logo_url AS "logoUrl",
                tagline, phone, email, address, city, opening_hours AS "openingHours",
                website, instagram, social_handle AS "socialHandle", status
    `, [
      trimmedName, 
      slug, 
      description?.trim() || `Demo appointment provider offering ${trimmedCategory}`, 
      trimmedCategory,
      currency || 'PHP', 
      timezone || 'Asia/Manila', 
      logoUrl?.trim() || null,
      tagline?.trim() || null,
      finalPhone,
      finalOwnerEmail,
      finalAddress,
      finalCity,
      finalOpeningHours,
      website?.trim() || null,
      finalSocMed,
      finalSocMed
    ]);
    const newBiz = bRes.rows[0];

    // 1b. Save Owner in users table as 'business_admin' with pending status and user-provided password
    let createdUser: any = null;
    if (finalOwnerEmail) {
      const bcrypt = await import('bcryptjs');
      const passwordToHash = ownerPassword && ownerPassword.trim() 
        ? ownerPassword.trim() 
        : 'Appointmo_' + Math.random().toString(36).substring(2, 8);
      const passwordHash = await bcrypt.default.hash(passwordToHash, 10);

      const existUser = await client.query('SELECT id, role, business_id FROM users WHERE email = $1', [finalOwnerEmail]);
      if (existUser.rows.length > 0) {
        await client.query(
          "UPDATE users SET business_id = $1, role = 'business_admin', status = 'pending', name = $2, password_hash = $3 WHERE email = $4",
          [newBiz.id, finalOwnerName, passwordHash, finalOwnerEmail]
        );
        createdUser = { id: existUser.rows[0].id, email: finalOwnerEmail, name: finalOwnerName };
      } else {
        const uRes = await client.query(`
          INSERT INTO users (business_id, email, password_hash, role, name, status)
          VALUES ($1, $2, $3, 'business_admin', $4, 'pending')
          RETURNING id, email, name, role, status
        `, [newBiz.id, finalOwnerEmail, passwordHash, finalOwnerName]);
        createdUser = uRes.rows[0];
      }
    }

    // City Coordinates Map fallback for synthetic map placement
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'Quezon City': { lat: 14.6507, lng: 121.0336 },
      'Makati': { lat: 14.5547, lng: 121.0244 },
      'Taguig / BGC': { lat: 14.5507, lng: 121.0506 },
      'Pasig / Ortigas': { lat: 14.5866, lng: 121.0617 },
      'San Juan / Greenhills': { lat: 14.6015, lng: 121.0503 },
      'Mandaluyong': { lat: 14.5794, lng: 121.0359 },
      'Manila': { lat: 14.5995, lng: 120.9842 },
      'Alabang / Muntinlupa': { lat: 14.4253, lng: 121.0422 },
      'Pasay': { lat: 14.5378, lng: 120.9993 },
    };

    const fallbackCoord = cityCoords[finalCity] || { lat: 14.5995, lng: 121.0000 };

    const finalLat = latitude !== undefined && latitude !== null && !isNaN(Number(latitude))
      ? Number(latitude)
      : fallbackCoord.lat + (Math.random() * 0.01 - 0.005);

    const finalLng = longitude !== undefined && longitude !== null && !isNaN(Number(longitude))
      ? Number(longitude)
      : fallbackCoord.lng + (Math.random() * 0.01 - 0.005);

    // 2. Automatically create internal default branch linking appointments to this store
    const brRes = await client.query(`
      INSERT INTO branches (business_id, name, address, city, phone, latitude, longitude, location_description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, address, city, phone, latitude, longitude, location_description AS "locationDescription"
    `, [
      newBiz.id, 
      `${trimmedName} Store`, 
      finalAddress, 
      finalCity, 
      finalPhone,
      finalLat,
      finalLng,
      `${trimmedName} - ${finalCity}`
    ]);

    // 3. Create default service
    const sRes = await client.query(`
      INSERT INTO services (business_id, name, description, duration_minutes, price, category)
      VALUES ($1, 'Standard Consultation', 'Initial comprehensive consultation and assessment session.', 45, 1000, 'Consultation')
      RETURNING id
    `, [newBiz.id]);

    // 4. Create default staff
    const spRes = await client.query(`
      INSERT INTO staff_profiles (business_id, name, bio)
      VALUES ($1, $2, 'Lead specialist and store practitioner.')
      RETURNING id
    `, [newBiz.id, finalOwnerName]);

    // Link staff service
    await client.query(`INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2)`, [spRes.rows[0].id, sRes.rows[0].id]);

    // Set working hours Mon-Sat
    for (let day = 1; day <= 6; day++) {
      await client.query(`
        INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
        VALUES ($1, $2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', true)
      `, [spRes.rows[0].id, day]);
    }

    // 5. Notify Super Admin of New Store Submission via System Notification
    await client.query(`
      INSERT INTO notifications (
        business_id, recipient_type, recipient_identifier, type, title, message, metadata
      ) VALUES ($1, 'superadmin', 'superadmin', 'system_alert', $2, $3, $4)
    `, [
      newBiz.id,
      `New Store Created: ${trimmedName}`,
      `A new store "${trimmedName}" (${trimmedCategory}) was created by ${finalOwnerName} (${finalOwnerEmail || 'no email provided'}). It is currently awaiting Super Admin review and approval.`,
      JSON.stringify({
        businessId: newBiz.id,
        storeName: trimmedName,
        storeSlug: slug,
        ownerName: finalOwnerName,
        ownerEmail: finalOwnerEmail,
        userId: createdUser?.id || null,
        city: finalCity,
      })
    ]);

    await client.query('COMMIT');

    // 6. If an email was provided during creation, dispatch the 1-2 business days confirmation email
    if (finalOwnerEmail) {
      try {
        await EmailService.sendStoreCreationPendingEmail({
          recipientEmail: finalOwnerEmail,
          recipientName: finalOwnerName,
          storeName: trimmedName,
        });
      } catch (emailErr) {
        console.error('Failed to dispatch store creation pending email:', emailErr);
      }
    }

    res.status(201).json({
      message: 'Your store is successfully created! Please wait 1 to 2 business days for review and approval before full access is granted.',
      business: newBiz,
      branch: brRes.rows[0],
      user: createdUser,
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
      WHERE (a.id::text = $1 OR a.booking_reference = $1)
    `, [id]);

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const appt = apptRes.rows[0];

    const historyRes = await query(`
      SELECT id, previous_status AS "previousStatus", new_status AS "newStatus", reason, changed_by AS "changedBy", created_at AS "createdAt"
      FROM appointment_status_history
      WHERE appointment_id = $1
      ORDER BY created_at ASC
    `, [appt.id]);

    res.json({
      appointment: appt,
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

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status transition: ${status}` });
    }

    await client.query('BEGIN');

    const existingRes = await client.query(`
      SELECT a.id, a.business_id, a.status, a.booking_reference, a.start_time, s.name AS service_name, c.name AS customer_name, c.email AS customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE (a.id::text = $1 OR a.booking_reference = $1)
    `, [id]);

    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const appt = existingRes.rows[0];
    const actualApptId = appt.id;
    const businessId = appt.business_id;

    const bCheck = await client.query('SELECT status FROM businesses WHERE id = $1', [businessId]);
    if (bCheck.rows[0]?.status === 'pending') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This store is pending approval. Appointment actions are locked until approved.' });
    }
    const prevStatus = appt.status;

    if (prevStatus === status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Appointment is already in ${status} status` });
    }

    await client.query(
      'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3 AND business_id = $4',
      [status, status === 'cancelled' ? (reason || 'Cancelled by admin') : null, actualApptId, businessId]
    );

    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $3, $4, 'admin')
    `, [actualApptId, prevStatus, status, reason || `Status updated to ${status} by admin`]);

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
      actualApptId,
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

    if (!newStartTime) {
      return res.status(400).json({ error: 'New start time is required for rescheduling' });
    }

    await client.query('BEGIN');

    // 1. Fetch current appointment details with service info
    const apptRes = await client.query(`
      SELECT a.id, a.business_id, a.booking_reference, a.status, a.staff_id, a.start_time, a.end_time,
             s.id AS service_id, s.name AS service_name, s.duration_minutes,
             c.name AS customer_name, c.email AS customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN customers c ON a.customer_id = c.id
      WHERE (a.id::text = $1 OR a.booking_reference = $1)
    `, [id]);

    if (apptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const appt = apptRes.rows[0];
    const bCheck = await client.query('SELECT status FROM businesses WHERE id = $1', [appt.business_id]);
    if (bCheck.rows[0]?.status === 'pending') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This store is pending approval. Rescheduling is locked until approved.' });
    }
    const actualApptId = appt.id;
    const businessId = appt.business_id;
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
    `, [targetStaffId, actualApptId, end, start]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'The selected rescheduled time slot conflicts with an existing booking. Please choose another time.' });
    }

    // 2. Perform reschedule update
    await client.query(`
      UPDATE appointments
      SET start_time = $1, end_time = $2, staff_id = $3, status = 'confirmed', updated_at = NOW()
      WHERE id = $4 AND business_id = $5
    `, [start, end, targetStaffId, actualApptId, businessId]);

    // 3. Add History
    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, 'confirmed', $3, 'admin')
    `, [actualApptId, appt.status, reason || `Rescheduled to ${start.toISOString()} by admin`]);

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
      actualApptId,
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
      actualApptId,
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

    if (!staffId) {
      return res.status(400).json({ error: 'Target staff member is required' });
    }

    await client.query('BEGIN');

    const apptRes = await client.query(`
      SELECT a.id, a.business_id, a.service_id, a.start_time, a.end_time, a.status, sp.name AS current_staff_name
      FROM appointments a
      JOIN staff_profiles sp ON a.staff_id = sp.id
      WHERE (a.id::text = $1 OR a.booking_reference = $1)
    `, [id]);

    if (apptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found in demo business records' });
    }

    const appt = apptRes.rows[0];
    const bCheck = await client.query('SELECT status FROM businesses WHERE id = $1', [appt.business_id]);
    if (bCheck.rows[0]?.status === 'pending') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This store is pending approval. Staff reassignment is locked until approved.' });
    }
    const actualApptId = appt.id;
    const businessId = appt.business_id;

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
    `, [staffId, actualApptId, appt.end_time, appt.start_time]);

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${targetStaffName} already has an appointment during this time slot` });
    }

    await client.query(
      'UPDATE appointments SET staff_id = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3',
      [staffId, actualApptId, businessId]
    );

    await client.query(`
      INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
      VALUES ($1, $2, $2, $3, 'admin')
    `, [actualApptId, appt.status, `Reassigned specialist from ${appt.current_staff_name} to ${targetStaffName}`]);

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
    const businessId = await getDemoBusinessId(req);
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
    const businessId = await getDemoBusinessId(req);
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

    const bizRes = await query(`
      SELECT id, name, slug, category, description, currency, timezone, logo_url AS "logoUrl",
             phone, email, address, city, opening_hours AS "openingHours",
             website, instagram, COALESCE(social_handle, instagram) AS "socialHandle", tagline, status
      FROM businesses
      WHERE id = $1
    `, [businessId]);
    const branchesRes = await query('SELECT id, name, address, city, phone, location_description AS "locationDescription" FROM branches WHERE business_id = $1 AND is_active = true', [businessId]);
    const servicesRes = await query('SELECT id, name, description, duration_minutes AS "durationMinutes", price, category FROM services WHERE business_id = $1 ORDER BY price ASC', [businessId]);
    const staffRes = await query(`
      SELECT id, name, bio, position, employment_type AS "employmentType",
             base_salary AS "baseSalary", commission_rate AS "commissionRate",
             hire_date AS "hireDate", email, phone, emergency_contact AS "emergencyContact",
             status
      FROM staff_profiles
      WHERE business_id = $1
      ORDER BY name ASC
    `, [businessId]);
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

// 12. Update Business Profile & Setup (Logo, description, hours, phone, address, status, policies)
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req, false);
    const {
      name, description, logoUrl, phone, email, address, city, openingHours,
      website, instagram, socialHandle, tagline, status, bookingPolicies
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description.trim());
    }
    if (logoUrl !== undefined) {
      fields.push(`logo_url = $${idx++}`);
      values.push(logoUrl ? logoUrl.trim() : null);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(phone.trim());
    }
    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email.trim());
    }
    if (address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(address.trim());
    }
    if (city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(city.trim());
    }
    if (openingHours !== undefined) {
      fields.push(`opening_hours = $${idx++}`);
      values.push(openingHours.trim());
    }
    if (website !== undefined) {
      fields.push(`website = $${idx++}`);
      values.push(website ? website.trim() : null);
    }
    if (instagram !== undefined || socialHandle !== undefined) {
      const handle = (socialHandle || instagram)?.trim() || null;
      fields.push(`instagram = $${idx++}`);
      values.push(handle);
      fields.push(`social_handle = $${idx++}`);
      values.push(handle);
    }
    if (tagline !== undefined) {
      fields.push(`tagline = $${idx++}`);
      values.push(tagline ? tagline.trim() : null);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (bookingPolicies !== undefined) {
      fields.push(`booking_policies = $${idx++}`);
      values.push(JSON.stringify(bookingPolicies));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(businessId);

    const updateSql = `
      UPDATE businesses
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, slug, category, description, currency, timezone, logo_url AS "logoUrl",
                phone, email, address, city, opening_hours AS "openingHours",
                website, instagram, COALESCE(social_handle, instagram) AS "socialHandle", tagline, status,
                booking_policies AS "bookingPolicies"
    `;

    const result = await query(updateSql, values);
    res.json({ message: 'Store profile successfully updated', business: result.rows[0] });
  } catch (err: any) {
    console.error('Update business profile error:', err);
    res.status(500).json({ error: 'Failed to update store profile: ' + err.message });
  }
});

// 13. Create or Add Staff Specialist with HRIS & Compensation details
router.post('/staff', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req, false);
    const { 
      name, bio, position, employmentType, baseSalary, commissionRate, 
      hireDate, email, phone, emergencyContact, serviceIds 
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Staff name is required' });
    }

    const spRes = await query(
      `INSERT INTO staff_profiles (
        business_id, name, bio, position, employment_type, base_salary, commission_rate,
        hire_date, email, phone, emergency_contact, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active') 
      RETURNING id, name, bio, position, employment_type AS "employmentType",
                base_salary AS "baseSalary", commission_rate AS "commissionRate",
                hire_date AS "hireDate", email, phone, emergency_contact AS "emergencyContact", status`,
      [
        businessId, 
        name.trim(), 
        bio?.trim() || 'Store specialist',
        position?.trim() || 'Specialist',
        employmentType?.trim() || 'Full-Time',
        Number(baseSalary) || 0,
        Number(commissionRate) || 0,
        hireDate || new Date().toISOString().split('T')[0],
        email?.trim() || null,
        phone?.trim() || null,
        emergencyContact?.trim() || null
      ]
    );
    const newStaff = spRes.rows[0];

    // Assign working hours Monday - Saturday default
    for (let day = 1; day <= 6; day++) {
      await query(`
        INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
        VALUES ($1, $2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', true)
        ON CONFLICT DO NOTHING
      `, [newStaff.id, day]);
    }

    if (Array.isArray(serviceIds)) {
      for (const sId of serviceIds) {
        await query(`INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [newStaff.id, sId]);
      }
    }

    res.status(201).json({ message: 'Staff specialist created', staff: newStaff });
  } catch (err: any) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff: ' + err.message });
  }
});

// 13b. Update Staff Specialist HRIS & Compensation details
router.put('/staff/:id', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req, false);
    const { id } = req.params;
    const { 
      name, bio, position, employmentType, baseSalary, commissionRate, 
      hireDate, email, phone, emergencyContact, status 
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Staff name is required' });
    }

    const spRes = await query(
      `UPDATE staff_profiles 
       SET name = $1, bio = $2, position = $3, employment_type = $4,
           base_salary = $5, commission_rate = $6, hire_date = $7,
           email = $8, phone = $9, emergency_contact = $10, status = $11, updated_at = NOW()
       WHERE id = $12 AND business_id = $13
       RETURNING id, name, bio, position, employment_type AS "employmentType",
                 base_salary AS "baseSalary", commission_rate AS "commissionRate",
                 hire_date AS "hireDate", email, phone, emergency_contact AS "emergencyContact", status`,
      [
        name.trim(),
        bio?.trim() || 'Store specialist',
        position?.trim() || 'Specialist',
        employmentType?.trim() || 'Full-Time',
        Number(baseSalary) || 0,
        Number(commissionRate) || 0,
        hireDate || new Date().toISOString().split('T')[0],
        email?.trim() || null,
        phone?.trim() || null,
        emergencyContact?.trim() || null,
        status || 'active',
        id,
        businessId
      ]
    );

    if (spRes.rows.length === 0) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }

    res.json({ message: 'Staff specialist updated', staff: spRes.rows[0] });
  } catch (err: any) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Failed to update staff: ' + err.message });
  }
});

// 13c. HRIS Payroll Records: Get and Record Staff Compensation / Payslip
router.get('/payroll', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req);
    const payrollRes = await query(`
      SELECT pr.id, pr.staff_id AS "staffId", sp.name AS "staffName", sp.position,
             pr.pay_period_start AS "payPeriodStart", pr.pay_period_end AS "payPeriodEnd",
             pr.base_pay AS "basePay", pr.commission_pay AS "commissionPay",
             pr.bonuses, pr.deductions, pr.net_salary AS "netSalary",
             pr.payment_status AS "paymentStatus", pr.payment_date AS "paymentDate",
             pr.notes, pr.created_at AS "createdAt"
      FROM payroll_records pr
      JOIN staff_profiles sp ON pr.staff_id = sp.id
      WHERE pr.business_id = $1
      ORDER BY pr.pay_period_end DESC, pr.created_at DESC
    `, [businessId]);

    res.json({ payroll: payrollRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch payroll records: ' + err.message });
  }
});

router.post('/payroll', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req, false);
    const { 
      staffId, payPeriodStart, payPeriodEnd, basePay, commissionPay, 
      bonuses, deductions, paymentStatus, notes 
    } = req.body;

    if (!staffId || !payPeriodStart || !payPeriodEnd) {
      return res.status(400).json({ error: 'Staff, pay period start and end dates are required' });
    }

    const bPay = Number(basePay) || 0;
    const cPay = Number(commissionPay) || 0;
    const bBonus = Number(bonuses) || 0;
    const dDeduct = Number(deductions) || 0;
    const netSalary = Math.max(0, (bPay + cPay + bBonus) - dDeduct);

    const prRes = await query(`
      INSERT INTO payroll_records (
        business_id, staff_id, pay_period_start, pay_period_end,
        base_pay, commission_pay, bonuses, deductions, net_salary,
        payment_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, staff_id AS "staffId", pay_period_start AS "payPeriodStart",
                pay_period_end AS "payPeriodEnd", base_pay AS "basePay",
                commission_pay AS "commissionPay", bonuses, deductions, net_salary AS "netSalary",
                payment_status AS "paymentStatus", payment_date AS "paymentDate", notes, created_at AS "createdAt"
    `, [
      businessId, staffId, payPeriodStart, payPeriodEnd,
      bPay, cPay, bBonus, dDeduct, netSalary,
      paymentStatus || 'paid', notes?.trim() || null
    ]);

    res.status(201).json({ message: 'Payroll recorded successfully', record: prRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record payroll: ' + err.message });
  }
});

// 14. Create or Add Service
router.post('/services', async (req: Request, res: Response) => {
  try {
    const businessId = await getDemoBusinessId(req, false);
    const { name, description, durationMinutes, price, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Service name and price are required' });
    }

    const sRes = await query(`
      INSERT INTO services (business_id, name, description, duration_minutes, price, category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, duration_minutes AS "durationMinutes", price, category
    `, [
      businessId,
      name.trim(),
      description?.trim() || 'Professional service offering',
      Number(durationMinutes) || 45,
      Number(price),
      category?.trim() || 'General'
    ]);

    res.status(201).json({ message: 'Service added successfully', service: sRes.rows[0] });
  } catch (err: any) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Failed to create service: ' + err.message });
  }
});

export default router;
