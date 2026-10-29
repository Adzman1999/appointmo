import { Router } from 'express';
import { authenticateAccessSession } from '../middleware/session';
import { getSession, login, setupPassword, submitRequest } from '../controllers/accessController';

const router = Router();

router.post('/request', submitRequest);
router.post('/setup-password', setupPassword);
router.post('/login', login);
router.get('/session', authenticateAccessSession, getSession);

export default router;
