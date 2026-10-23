import { query, pool } from '../db';

export interface CreateNotificationParams {
  businessId: string;
  appointmentId?: string;
  recipientType: 'admin' | 'customer';
  recipientIdentifier: string; // 'admin' or customer email or booking reference
  type: 'booking_created' | 'booking_confirmed' | 'booking_rescheduled' | 'booking_cancelled' | 'system_alert';
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Create a notification record transactionally or directly
   */
  static async create(params: CreateNotificationParams) {
    const { businessId, appointmentId, recipientType, recipientIdentifier, type, title, message } = params;

    const res = await query(`
      INSERT INTO notifications (
        business_id, appointment_id, recipient_type, recipient_identifier, type, title, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [businessId, appointmentId || null, recipientType, recipientIdentifier, type, title, message]);

    return res.rows[0];
  }

  /**
   * Fetch admin notifications for a business
   */
  static async getAdminNotifications(businessId: string, limit = 30) {
    const listRes = await query(`
      SELECT n.id, n.appointment_id AS "appointmentId", n.type, n.title, n.message,
             n.is_read AS "isRead", n.created_at AS "createdAt",
             a.booking_reference AS "bookingReference",
             s.name AS "serviceName"
      FROM notifications n
      LEFT JOIN appointments a ON n.appointment_id = a.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE n.business_id = $1 AND n.recipient_type = 'admin' AND n.is_read = false
      ORDER BY n.created_at DESC
      LIMIT $2
    `, [businessId, limit]);

    const unreadRes = await query(`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE business_id = $1 AND recipient_type = 'admin' AND is_read = false
    `, [businessId]);

    return {
      notifications: listRes.rows,
      unreadCount: unreadRes.rows[0].count,
    };
  }

  /**
   * Fetch notifications for a specific booking / customer
   */
  static async getCustomerNotifications(bookingReference: string, tokenHash: string) {
    const apptRes = await query(`
      SELECT id, business_id FROM appointments
      WHERE booking_reference = $1 AND management_token_hash = $2
    `, [bookingReference, tokenHash]);

    if (apptRes.rows.length === 0) {
      throw new Error('Appointment not found or unauthorized');
    }

    const appt = apptRes.rows[0];

    const listRes = await query(`
      SELECT id, appointment_id AS "appointmentId", type, title, message,
             is_read AS "isRead", created_at AS "createdAt"
      FROM notifications
      WHERE (appointment_id = $1 OR recipient_identifier = $2)
        AND recipient_type = 'customer'
      ORDER BY created_at DESC
    `, [appt.id, bookingReference]);

    const unreadRes = await query(`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE (appointment_id = $1 OR recipient_identifier = $2)
        AND recipient_type = 'customer' AND is_read = false
    `, [appt.id, bookingReference]);

    return {
      notifications: listRes.rows,
      unreadCount: unreadRes.rows[0].count,
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id: string) {
    await query(`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  /**
   * Mark all notifications for admin or customer as read
   */
  static async markAllAsRead(recipientType: 'admin' | 'customer', recipientIdentifier: string, businessId?: string) {
    let sql = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE recipient_type = $1 AND recipient_identifier = $2 AND is_read = false
    `;
    const params: any[] = [recipientType, recipientIdentifier];

    if (businessId && recipientType === 'admin') {
      sql += ' AND business_id = $3';
      params.push(businessId);
    }

    await query(sql, params);
  }
}
