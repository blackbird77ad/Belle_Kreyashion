import { Router } from 'express';
import {
  getPublicProducts, getPublicProduct, getDiscountedProducts,
  getCategories, getAllProducts, createProduct, updateProduct,
  deleteProduct, toggleProduct
} from '../Controllers/productController.mjs';
import { protect } from '../Middlewares/auth.mjs';
import { uploadImages } from '../Middlewares/upload.mjs';

const router = Router();

// ── Image upload endpoint ─────────────────────────────────────────────────────
// POST /api/products/upload  →  returns array of Cloudinary URLs
router.post('/upload', protect, (req, res) => {
  uploadImages(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.files?.length) return res.status(400).json({ message: 'No images uploaded' });
    const urls = req.files.map(f => f.path);
    res.json({ urls });
  });
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/public',       getPublicProducts);
router.get('/discounted',   getDiscountedProducts);
router.get('/categories',   getCategories);
router.get('/public/:id',   getPublicProduct);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/',             protect, getAllProducts);
router.post('/',            protect, createProduct);
router.put('/:id',          protect, updateProduct);
router.delete('/:id',       protect, deleteProduct);
router.patch('/:id/toggle', protect, toggleProduct);

export default router;
