import { Router } from 'express';
import { saveAbandonedCart, getAbandonedCarts, verifyAndCreateOrder, getAllOrders } from '../Controllers/orderController.mjs';
import { protect } from '../Middlewares/auth.mjs';
const router = Router();
router.post('/abandoned', saveAbandonedCart);
router.get('/abandoned', protect, getAbandonedCarts);
router.post('/verify', verifyAndCreateOrder);
router.get('/', protect, getAllOrders);
export default router;
