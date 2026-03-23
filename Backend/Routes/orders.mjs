import { Router } from 'express';
import {
  saveAbandonedCart, getAbandonedCarts, toggleFollowUp,
  verifyAndCreateOrder, getAllOrders, updateOrderStatus, getCustomerOrders
} from '../Controllers/orderController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();
router.post('/abandoned',               saveAbandonedCart);
router.get('/abandoned',      protect,  getAbandonedCarts);
router.patch('/abandoned/:id/toggle', protect, toggleFollowUp);
router.post('/verify',                  verifyAndCreateOrder);
router.get('/',               protect,  getAllOrders);
router.patch('/:id/status',   protect,  updateOrderStatus);
router.get('/customer/:phone',          getCustomerOrders);
export default router;
