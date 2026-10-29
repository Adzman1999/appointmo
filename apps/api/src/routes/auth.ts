import { Router } from 'express';
import { login, register, updateCurrentAccount } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.put('/account', updateCurrentAccount);

export default router;
