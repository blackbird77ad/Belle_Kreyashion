import { Router } from 'express';
import {
  disconnectYouTube,
  finishYouTubeConnection,
  getYouTubeStatus,
  startYouTubeConnection,
  startYouTubeUpload,
} from '../Controllers/youtubeController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();

router.get('/oauth/callback', finishYouTubeConnection);
router.get('/admin/status', protect, getYouTubeStatus);
router.post('/admin/connect', protect, startYouTubeConnection);
router.delete('/admin/connection', protect, disconnectYouTube);
router.post('/admin/uploads', protect, startYouTubeUpload);

export default router;
