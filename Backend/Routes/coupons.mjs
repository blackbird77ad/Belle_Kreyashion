import { Router } from 'express';
import { createCoupon, deleteCoupon, getCoupons, toggleCoupon, updateCoupon } from '../Controllers/couponController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();
router.get('/', protect, getCoupons);
router.post('/', protect, createCoupon);
router.put('/:id', protect, updateCoupon);
router.patch('/:id/toggle', protect, toggleCoupon);
router.delete('/:id', protect, deleteCoupon);
export default router;
