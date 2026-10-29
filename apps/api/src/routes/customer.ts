import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { createReview, getMe, markAllNotificationsRead, markNotificationRead } from '../controllers/customerController';

const router = Router();

router.get('/me', authenticateJwt, getMe);
router.post('/reviews', authenticateJwt, createReview);
router.patch('/notifications/:id/read', authenticateJwt, markNotificationRead);
router.post('/notifications/mark-all-read', authenticateJwt, markAllNotificationsRead);

export default router;
