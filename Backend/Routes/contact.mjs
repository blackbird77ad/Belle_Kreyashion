import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry } from '../Controllers/contactController.mjs';

const router = Router();

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many contact form messages were sent from this browser. Please wait a few minutes and try again.',
  },
});

router.post('/inquiry', inquiryLimiter, submitContactInquiry);

export default router;
