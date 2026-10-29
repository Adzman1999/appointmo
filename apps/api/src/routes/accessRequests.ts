import { Router } from 'express';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { approveRequest, listRequests, redeemInvitation, revokeRequest, submitRequest } from '../controllers/accessRequestController';

const router = Router();

router.post('/requests', submitRequest);
router.get('/requests', authenticateJwt, requireRole(['platform_admin']), listRequests);
router.post('/requests/:id/approve', authenticateJwt, requireRole(['platform_admin']), approveRequest);
router.post('/requests/:id/revoke', authenticateJwt, requireRole(['platform_admin']), revokeRequest);
router.post('/redeem', redeemInvitation);

export default router;
