import { Request, Response } from 'express';
import {
  CustomerServiceError,
  getCustomerAccount,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
  submitCustomerReview,
} from '../services/customerService';

const sendCustomerError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof CustomerServiceError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : 'Server error';
  return res.status(500).json({ error: `${fallback}: ${message}` });
};

export async function getMe(req: Request, res: Response) {
  try {
    return res.json(await getCustomerAccount(req.user || {}));
  } catch (error) {
    console.error('Failed to get customer profile:', error);
    return sendCustomerError(res, error, 'Failed to retrieve customer account details');
  }
}

export async function createReview(req: Request, res: Response) {
  try {
    const review = await submitCustomerReview(req.user || {}, req.body || {});
    return res.status(201).json({ review });
  } catch (error) {
    if (!(error instanceof CustomerServiceError)) {
      console.error('Failed to submit customer review:', error);
    }
    if (error instanceof CustomerServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    await markCustomerNotificationAsRead(req.params.id);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    await markAllCustomerNotificationsAsRead(req.user || {});
    return res.json({ success: true });
  } catch (error) {
    return sendCustomerError(res, error, 'Failed to mark all notifications as read');
  }
}
