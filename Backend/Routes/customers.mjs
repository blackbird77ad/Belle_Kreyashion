import { Router } from 'express';
import {
  getAllCustomers,
  getCurrentCustomer,
  getCustomerDashboard,
  getCustomerHistory,
  getOrderHistory,
  identifyCustomer,
  loginCustomer,
  requestCustomerPasswordReset,
  resendCustomerVerification,
  resetCustomerPassword,
  signupCustomer,
  verifyCustomerEmail,
} from '../Controllers/customerController.mjs';
import { protect, protectCustomer } from '../Middlewares/auth.mjs';

const router = Router();

router.post('/signup', signupCustomer);
router.post('/login', loginCustomer);
router.get('/me', protectCustomer, getCurrentCustomer);
router.get('/dashboard', protectCustomer, getCustomerDashboard);
router.get('/history', protectCustomer, getCustomerHistory);
router.post('/password-reset/request', requestCustomerPasswordReset);
router.post('/password-reset/reset', resetCustomerPassword);
router.post('/verify', verifyCustomerEmail);
router.post('/verify/resend', protectCustomer, resendCustomerVerification);

router.post('/identify', identifyCustomer);
router.get('/history/:phone', getOrderHistory);
router.get('/', protect, getAllCustomers);

export default router;
