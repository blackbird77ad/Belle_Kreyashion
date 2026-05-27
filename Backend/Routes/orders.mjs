import { Router } from 'express';
import {
  saveAbandonedCart, getAbandonedCarts, toggleFollowUp,
  verifyAndCreateOrder, createFreeDigitalOrder, getAllOrders, getSalesAnalytics, updateOrderStatus, getCustomerOrders,
  runDigitalTrialBillingTrigger,
} from '../Controllers/orderController.mjs';
import { protect, protectAdminOrCron } from '../Middlewares/auth.mjs';

const router = Router();
router.post('/abandoned',               saveAbandonedCart);
router.get('/abandoned',      protect,  getAbandonedCarts);
router.patch('/abandoned/:id/toggle', protect, toggleFollowUp);
router.get('/trial-billing/run', protectAdminOrCron, runDigitalTrialBillingTrigger);
router.post('/trial-billing/run', protectAdminOrCron, runDigitalTrialBillingTrigger);
router.post('/free-digital',            createFreeDigitalOrder);
router.post('/verify',                  verifyAndCreateOrder);
router.get('/',               protect,  getAllOrders);
router.get('/analytics',      protect,  getSalesAnalytics);
router.patch('/:id/status',   protect,  updateOrderStatus);
router.get('/customer/:phone',          getCustomerOrders);
export default router;
