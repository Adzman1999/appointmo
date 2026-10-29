import {
  findAppointmentForCustomerNotifications,
  insertNotification,
  listAdminNotifications,
  listCustomerNotifications,
  markNotificationRead as markNotificationReadRecord,
  markNotificationsRead,
} from '../repositories/notificationRepository';

export interface CreateNotificationParams {
  businessId: string;
  appointmentId?: string;
  recipientType: 'admin' | 'customer';
  recipientIdentifier: string;
  type: 'booking_created' | 'booking_confirmed' | 'booking_rescheduled' | 'booking_cancelled' | 'system_alert';
  title: string;
  message: string;
}

export class NotificationService {
  static create(params: CreateNotificationParams) {
    return insertNotification(params);
  }

  static getAdminNotifications(businessId: string, limit = 30) {
    return listAdminNotifications(businessId, limit);
  }

  static async getCustomerNotifications(bookingReference: string, tokenHash: string) {
    const appointment = await findAppointmentForCustomerNotifications(bookingReference, tokenHash);
    if (!appointment) throw new Error('Appointment not found or unauthorized');
    return listCustomerNotifications(appointment.id, bookingReference);
  }

  static markAsRead(id: string) {
    return markNotificationReadRecord(id);
  }

  static markAllAsRead(recipientType: 'admin' | 'customer', recipientIdentifier: string, businessId?: string) {
    return markNotificationsRead({ recipientType, recipientIdentifier, businessId });
  }
}
