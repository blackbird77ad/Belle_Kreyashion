import { Router } from 'express';
import { getStatus, setup, login, resetPin } from '../Controllers/authController.mjs';
const router = Router();
router.get('/status', getStatus);
router.post('/setup', setup);
router.post('/login', login);
router.post('/reset', resetPin);
export default router;
