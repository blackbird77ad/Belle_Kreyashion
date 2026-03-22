import { Router } from 'express';
import { getSettings, updateSettings } from '../Controllers/consultationController.mjs';
import { protect } from '../Middlewares/auth.mjs';
const router = Router();
router.get('/settings', getSettings);
router.put('/settings', protect, updateSettings);
export default router;
