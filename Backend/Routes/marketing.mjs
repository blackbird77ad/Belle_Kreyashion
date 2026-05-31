import { Router } from 'express';
import { captureMetaBrowserEvent } from '../Controllers/marketingController.mjs';

const router = Router();

router.post('/meta/event', captureMetaBrowserEvent);

export default router;
