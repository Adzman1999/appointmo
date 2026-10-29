import { query } from '../db';

export async function insertNotification(input: {
  businessId: string;
  appointmentId?: string;
  recipientType: string;
  recipientIdentifier: string;
  type: string;
  title: string;
  message: string;
}) {
  const result = await query(
    `INSERT INTO notifications (
       business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.businessId, input.appointmentId || null, input.recipientType,
      input.recipientIdentifier, input.type, input.title, input.message,
    ]
  );
  return result.rows[0];
}

export async function listAdminNotifications(businessId: string, limit: number) {
  const list = await query(
    `SELECT n.id, n.appointment_id AS "appointmentId", n.type, n.title, n.message,
            n.is_read AS "isRead", n.created_at AS "createdAt",
            a.booking_reference AS "bookingReference", s.name AS "serviceName"
     FROM notifications n
     LEFT JOIN appointments a ON n.appointment_id = a.id
     LEFT JOIN services s ON a.service_id = s.id
     WHERE n.business_id = $1 AND n.recipient_type = 'admin' AND n.is_read = false
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [businessId, limit]
  );
  const unread = await query(
    `SELECT COUNT(*)::int AS count
     FROM notifications WHERE business_id = $1 AND recipient_type = 'admin' AND is_read = false`,
    [businessId]
  );
  return { notifications: list.rows, unreadCount: unread.rows[0].count };
}

export async function findAppointmentForCustomerNotifications(bookingReference: string, tokenHash: string) {
  const result = await query(
    `SELECT id, business_id FROM appointments
     WHERE booking_reference = $1 AND management_token_hash = $2`,
    [bookingReference, tokenHash]
  );
  return result.rows[0];
}

export async function listCustomerNotifications(appointmentId: string, bookingReference: string) {
  const list = await query(
    `SELECT id, appointment_id AS "appointmentId", type, title, message,
            is_read AS "isRead", created_at AS "createdAt"
     FROM notifications
     WHERE (appointment_id = $1 OR recipient_identifier = $2)
       AND recipient_type = 'customer'
     ORDER BY created_at DESC`,
    [appointmentId, bookingReference]
  );
  const unread = await query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE (appointment_id = $1 OR recipient_identifier = $2)
       AND recipient_type = 'customer' AND is_read = false`,
    [appointmentId, bookingReference]
  );
  return { notifications: list.rows, unreadCount: unread.rows[0].count };
}

export async function markNotificationRead(id: string) {
  await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1', [id]);
}

export async function markNotificationsRead(input: {
  recipientType: 'admin' | 'customer';
  recipientIdentifier: string;
  businessId?: string;
}) {
  let sql = `UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE recipient_type = $1 AND recipient_identifier = $2 AND is_read = false`;
  const params: any[] = [input.recipientType, input.recipientIdentifier];
  if (input.businessId && input.recipientType === 'admin') {
    sql += ' AND business_id = $3';
    params.push(input.businessId);
  }
  await query(sql, params);
}
