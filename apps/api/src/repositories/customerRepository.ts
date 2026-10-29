import { query } from '../db';

export async function findCustomerUser(userId: string, email: string) {
  const result = await query(
    `SELECT id, name, email, phone, role, created_at AS "createdAt"
     FROM users
     WHERE id = $1 AND LOWER(email) = $2 AND role = 'customer'
     LIMIT 1`,
    [userId, email]
  );
  return result.rows[0];
}

export async function findCustomerByEmail(email: string) {
  const result = await query(
    `SELECT id, name, email, phone, created_at AS "createdAt"
     FROM customers
     WHERE LOWER(email) = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return result.rows[0];
}

export async function findDefaultBusinessId() {
  const approved = await query("SELECT id FROM businesses WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1");
  if (approved.rows[0]?.id) return approved.rows[0].id;
  const anyBusiness = await query('SELECT id FROM businesses LIMIT 1');
  return anyBusiness.rows[0]?.id;
}

export async function createCustomerProfile(input: {
  businessId: string;
  name: string;
  email: string;
  phone: string;
}) {
  const result = await query(
    `INSERT INTO customers (business_id, name, email, phone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (business_id, email) DO UPDATE SET name = $2, phone = $4
     RETURNING id, name, email, phone, created_at AS "createdAt"`,
    [input.businessId, input.name, input.email, input.phone]
  );
  return result.rows[0];
}

export async function listCustomerAppointments(userId: string, email: string, customerId: string | null) {
  const result = await query(
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
    [userId, email, customerId]
  );
  return result.rows;
}

export async function listCustomerNotifications(email: string, appointmentIds: string[]) {
  const result = await query(
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
    [email, appointmentIds]
  );
  return result.rows;
}

export async function findCustomerUserForReview(userId: string, email: string) {
  const result = await query(
    `SELECT id, name FROM users WHERE id = $1 AND LOWER(email) = $2 AND role = 'customer' LIMIT 1`,
    [userId, email]
  );
  return result.rows[0];
}

export async function findCompletedAppointmentForReview(input: {
  appointmentId: string;
  userId: string;
  userName: string;
  email: string;
}) {
  const result = await query(
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
    [input.appointmentId, input.userId, input.userName, input.email]
  );
  return result.rows[0];
}

export async function createReview(input: {
  businessId: string;
  branchId: string;
  serviceId: string;
  appointmentId: string;
  customerName: string;
  storeRating: number;
  comment: string | null;
  userId: string;
  customerId: string;
  staffId: string;
  staffRating: number;
}) {
  const result = await query(
    `INSERT INTO reviews (
       business_id, branch_id, service_id, appointment_id, customer_name, rating,
       comment, user_id, customer_id, staff_id, staff_rating
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (appointment_id) WHERE appointment_id IS NOT NULL AND user_id IS NOT NULL DO NOTHING
     RETURNING id, rating AS "storeRating", staff_rating AS "staffRating", comment, created_at AS "createdAt"`,
    [
      input.businessId, input.branchId, input.serviceId, input.appointmentId,
      input.customerName, input.storeRating, input.comment, input.userId,
      input.customerId, input.staffId, input.staffRating,
    ]
  );
  return result.rows[0];
}

export async function markCustomerNotificationRead(id: string) {
  await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1', [id]);
}

export async function markAllCustomerNotificationsRead(email: string, userId: string) {
  await query(
    `UPDATE notifications n
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
       )`,
    [email, userId]
  );
}
