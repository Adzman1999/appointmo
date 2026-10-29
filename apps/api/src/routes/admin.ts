import { Router } from 'express';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { ensureSeedData, getAppointments, getMetrics, updateAppointmentStatus } from '../controllers/adminController';

const router = Router();
const requireAdminRole = requireRole(['platform_admin', 'business_admin']);

router.get('/metrics', authenticateJwt, requireAdminRole, getMetrics);
router.get('/appointments', authenticateJwt, requireAdminRole, getAppointments);
router.patch('/appointments/:id/status', authenticateJwt, requireAdminRole, updateAppointmentStatus);
router.post('/seed', authenticateJwt, requireRole(['platform_admin']), ensureSeedData);

export default router;
