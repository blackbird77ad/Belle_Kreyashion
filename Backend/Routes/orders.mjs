import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllOrders, getSalesAnalytics, updateOrderStatus, getCustomerOrders,
  runDigitalTrialBillingTrigger,
} from '../Controllers/orderController.mjs';
import { getAbandonedCarts, recoverCart, saveAbandonedCart, sendRecoveryNow, toggleFollowUp } from '../Controllers/abandonedCartController.mjs';
import {
  confirmManualPayment,
  getAdminPayments,
  getPaymentProviderStatus,
  getPaymentState,
  initializeCheckout,
  quoteCheckout,
  receivePaystackWebhook,
  rejectManualPayment,
  retryOrderFinalization,
  verifyCheckoutPayment,
} from '../Controllers/checkoutController.mjs';
import { protect, protectAdminOrCron } from '../Middlewares/auth.mjs';

const router = Router();
const checkoutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: true, legacyHeaders: false });
const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });
router.post('/abandoned', recoveryLimiter, saveAbandonedCart);
router.get('/abandoned',      protect,  getAbandonedCarts);
router.patch('/abandoned/:id/toggle', protect, toggleFollowUp);
router.post('/abandoned/:id/send-recovery', protect, sendRecoveryNow);
router.get('/recover/:token', recoveryLimiter, recoverCart);
router.get('/trial-billing/run', protectAdminOrCron, runDigitalTrialBillingTrigger);
router.post('/trial-billing/run', protectAdminOrCron, runDigitalTrialBillingTrigger);
router.post('/quote', checkoutLimiter, quoteCheckout);
router.post('/checkout', checkoutLimiter, initializeCheckout);
router.post('/verify', checkoutLimiter, verifyCheckoutPayment);
router.post('/paystack/webhook', receivePaystackWebhook);
router.get('/payments/admin', protect, getAdminPayments);
router.get('/payments/provider-status', protect, getPaymentProviderStatus);
router.get('/payments/:reference', getPaymentState);
router.post('/:id/payment/confirm', protect, confirmManualPayment);
router.post('/:id/payment/reject', protect, rejectManualPayment);
router.post('/:id/payment/retry', protect, retryOrderFinalization);
router.get('/',               protect,  getAllOrders);
router.get('/analytics',      protect,  getSalesAnalytics);
router.patch('/:id/status',   protect,  updateOrderStatus);
router.get('/customer/:phone',          getCustomerOrders);
export default router;
