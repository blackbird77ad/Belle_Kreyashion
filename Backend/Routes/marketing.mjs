import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { captureMarketingActivity, captureMetaBrowserEvent, getMarketingAdminStatus } from '../Controllers/marketingController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();
const activityLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/meta/event', captureMetaBrowserEvent);
router.post('/activity', activityLimiter, captureMarketingActivity);
router.get('/admin/status', protect, getMarketingAdminStatus);

export default router;
