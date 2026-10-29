import { query } from '../db';

export async function findDefaultBusinessId() {
  const approved = await query("SELECT id FROM businesses WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1");
  if (approved.rows[0]?.id) return approved.rows[0].id;
  const anyBusiness = await query('SELECT id FROM businesses LIMIT 1');
  return anyBusiness.rows[0]?.id;
}

export async function getDashboardMetricRows(businessId: string | undefined) {
  const statusRows = await query(
    `SELECT status, COUNT(*)::int AS count
     FROM appointments WHERE business_id = $1 GROUP BY status`,
    [businessId]
  );
  const today = await query(
    `SELECT COUNT(*)::int AS count
     FROM appointments
     WHERE business_id = $1
       AND start_time >= CURRENT_DATE AT TIME ZONE 'Asia/Manila'
       AND start_time < (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Asia/Manila'
       AND status NOT IN ('cancelled')`,
    [businessId]
  );
  const revenue = await query(
    `SELECT COALESCE(SUM(price_snapshot), 0)::numeric AS "totalRevenue"
     FROM appointments WHERE business_id = $1 AND status = 'completed'`,
    [businessId]
  );
  const popularServices = await query(
    `SELECT s.name, COUNT(a.id)::int AS bookings, SUM(a.price_snapshot)::numeric AS revenue
     FROM appointments a
     JOIN services s ON a.service_id = s.id
     WHERE a.business_id = $1 AND a.status != 'cancelled'
     GROUP BY s.name
     ORDER BY bookings DESC
     LIMIT 5`,
    [businessId]
  );

  return {
    statuses: statusRows.rows,
    todayCount: today.rows[0].count,
    totalRevenue: revenue.rows[0].totalRevenue,
    servicePopularity: popularServices.rows,
  };
}

export async function listAppointments(filters: {
  businessId: string | undefined;
  status?: any;
  search?: any;
  limit: number;
  offset: number;
}) {
  let sql = `
    SELECT
      a.id, a.booking_reference AS "bookingReference", a.status,
      a.start_time AS "startTime", a.end_time AS "endTime",
      a.recipient_name AS "recipientName", a.recipient_email AS "recipientEmail",
      a.recipient_phone AS "recipientPhone",
      a.price_snapshot AS "price", a.currency, a.notes, a.created_at AS "createdAt",
      s.name AS "serviceName", sp.name AS "staffName",
      c.name AS "customerName", c.email AS "customerEmail", c.phone AS "customerPhone"
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN staff_profiles sp ON a.staff_id = sp.id
    JOIN customers c ON a.customer_id = c.id
    WHERE a.business_id = $1
  `;
  const params: any[] = [filters.businessId];

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    sql += ` AND a.status = $${params.length}`;
  }

  if (filters.search && typeof filters.search === 'string') {
    params.push(`%${filters.search}%`);
    sql += ` AND (c.name ILIKE $${params.length} OR a.recipient_name ILIKE $${params.length} OR a.booking_reference ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
  }

  sql += ` ORDER BY a.start_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(filters.limit, filters.offset);
  const result = await query(sql, params);
  return result.rows;
}

export async function findAppointmentStatus(appointmentId: string) {
  const result = await query('SELECT status FROM appointments WHERE id = $1', [appointmentId]);
  return result.rows[0]?.status as string | undefined;
}

export async function updateAppointmentStatus(appointmentId: string, status: unknown) {
  await query('UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2', [status, appointmentId]);
}

export async function recordAppointmentStatusChange(input: {
  appointmentId: string;
  previousStatus: string;
  newStatus: unknown;
  reason: unknown;
  changedBy: string;
}) {
  await query(
    `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.appointmentId, input.previousStatus, input.newStatus, input.reason || '', input.changedBy]
  );
}
