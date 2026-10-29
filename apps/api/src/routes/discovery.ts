import { Router } from 'express';
import { getBusiness, getBusinesses, getCategories } from '../controllers/discoveryController';

const router = Router();

router.get('/businesses', getBusinesses);
router.get('/businesses/:slugOrId', getBusiness);
router.get('/categories', getCategories);

export default router;
