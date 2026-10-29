import { getCustomerChangeCutoffHours } from './bookingPolicies';
import { NotificationService } from './notification';
import {
  createReview,
  createCustomerProfile,
  findCompletedAppointmentForReview,
  findCustomerByEmail,
  findCustomerUser,
  findCustomerUserForReview,
  findDefaultBusinessId,
  listCustomerAppointments,
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from '../repositories/customerRepository';

export class CustomerServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'CustomerServiceError';
  }
}

type CustomerIdentity = { userId?: string; email?: string };

export async function getCustomerAccount(identity: CustomerIdentity) {
  if (!identity.email || !identity.userId) {
    throw new CustomerServiceError('Unauthorized', 401);
  }

  const cleanEmail = identity.email.trim().toLowerCase();
  const userData = await findCustomerUser(identity.userId, cleanEmail);
  if (!userData) {
    throw new CustomerServiceError('Sign in with a customer account to view your appointments.', 403);
  }

  let customerProfile = await findCustomerByEmail(cleanEmail);
  if (!customerProfile) {
    const defaultBusinessId = await findDefaultBusinessId();
    if (defaultBusinessId) {
      customerProfile = await createCustomerProfile({
        businessId: defaultBusinessId,
        name: userData.name || 'Customer',
        email: cleanEmail,
        phone: userData.phone || '+63 900 000 0000',
      });
    }
  }

  const rawAppointments = await listCustomerAppointments(
    userData.id,
    cleanEmail,
    customerProfile?.id || null
  );
  const appointments = rawAppointments.map((appointment: any) => ({
    ...appointment,
    customerChangeCutoffHours: getCustomerChangeCutoffHours(appointment.bookingPolicies),
    bookingPolicies: undefined,
    managementToken: `${appointment.bookingReference}secret`,
  }));

  const now = new Date();
  const upcoming = appointments.filter((appointment: any) =>
    (appointment.status === 'confirmed' || appointment.status === 'pending') && new Date(appointment.startTime) > now
  );
  const past = appointments.filter((appointment: any) =>
    appointment.status === 'completed' ||
    ((appointment.status === 'confirmed' || appointment.status === 'pending') && new Date(appointment.startTime) <= now)
  );
  const cancelled = appointments.filter((appointment: any) => appointment.status === 'cancelled');

  const notifications = await listCustomerNotifications(
    cleanEmail,
    appointments.map((appointment: any) => appointment.id).filter(Boolean)
  );

  return {
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
    unreadCount: notifications.filter((notification: any) => !notification.isRead).length,
  };
}

export async function submitCustomerReview(identity: CustomerIdentity, input: {
  storeRating?: unknown;
  staffRating?: unknown;
  comment?: unknown;
  appointmentId?: unknown;
}) {
  if (!identity.userId || !identity.email) {
    throw new CustomerServiceError('Sign in with your customer account to leave a review.', 401);
  }

  const storeRating = Number(input.storeRating);
  const staffRating = Number(input.staffRating);
  const comment = typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '';
  const appointmentId = typeof input.appointmentId === 'string' ? input.appointmentId : '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointmentId);

  if (!isUuid || !Number.isInteger(storeRating) || storeRating < 1 || storeRating > 5 ||
      !Number.isInteger(staffRating) || staffRating < 1 || staffRating > 5) {
    throw new CustomerServiceError('Choose a 1 to 5 star rating for both the store and specialist.', 400);
  }

  const cleanEmail = identity.email.trim().toLowerCase();
  const customerUser = await findCustomerUserForReview(identity.userId, cleanEmail);
  if (!customerUser) {
    throw new CustomerServiceError('Sign in with a customer account to leave a review.', 403);
  }

  const appointment = await findCompletedAppointmentForReview({
    appointmentId,
    userId: customerUser.id,
    userName: customerUser.name,
    email: cleanEmail,
  });
  if (!appointment) {
    throw new CustomerServiceError('Only completed appointments booked by your account can be reviewed.', 404);
  }

  const review = await createReview({
    businessId: appointment.businessId,
    branchId: appointment.branchId,
    serviceId: appointment.serviceId,
    appointmentId: appointment.id,
    customerName: appointment.customerName,
    storeRating,
    comment: comment || null,
    userId: customerUser.id,
    customerId: appointment.customerId,
    staffId: appointment.staffId,
    staffRating,
  });
  if (!review) throw new CustomerServiceError('This appointment has already been reviewed.', 409);

  try {
    await NotificationService.create({
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      recipientType: 'admin',
      recipientIdentifier: 'admin',
      type: 'system_alert',
      title: 'New customer rating',
      message: `${appointment.customerName} rated the store ${storeRating}/5 and specialist ${staffRating}/5.${comment ? ` Comment: ${comment}` : ''}`,
    });
  } catch (notificationError) {
    console.error('Customer rating saved but admin notification failed:', notificationError);
  }

  return review;
}

export async function markCustomerNotificationAsRead(id: string) {
  await markCustomerNotificationRead(id);
}

export async function markAllCustomerNotificationsAsRead(identity: CustomerIdentity) {
  if (!identity.email) throw new CustomerServiceError('Unauthorized', 401);
  await markAllCustomerNotificationsRead(identity.email.trim().toLowerCase(), identity.userId || '');
}
