import { Router } from 'express';
import {
  getActiveFeatured, getAllFeatured, createFeatured,
  updateFeatured, deleteFeatured, toggleFeatured
} from '../Controllers/featuredController.mjs';
import { protect } from '../Middlewares/auth.mjs';
import { uploadImages } from '../Middlewares/upload.mjs';

const router = Router();

// ── Image upload endpoint ─────────────────────────────────────────────────────
// POST /api/featured/upload  →  returns array of Cloudinary URLs
router.post('/upload', protect, (req, res) => {
  uploadImages(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.files?.length) return res.status(400).json({ message: 'No images uploaded' });
    const urls = req.files.map(f => f.path);
    res.json({ urls });
  });
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/public',       getActiveFeatured);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/',             protect, getAllFeatured);
router.post('/',            protect, createFeatured);
router.put('/:id',          protect, updateFeatured);
router.delete('/:id',       protect, deleteFeatured);
router.patch('/:id/toggle', protect, toggleFeatured);

export default router;
