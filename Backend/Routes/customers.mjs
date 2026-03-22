import { Router } from 'express';
import { identifyCustomer, getOrderHistory, getAllCustomers } from '../Controllers/customerController.mjs';
import { protect } from '../Middlewares/auth.mjs';
const router = Router();
router.post('/identify', identifyCustomer);
router.get('/history/:phone', getOrderHistory);
router.get('/', protect, getAllCustomers);
export default router;
