import { Router } from 'express';
import {
  getPublicProducts, getPublicProduct, getDiscountedProducts,
  getCategories, getAllProducts, createProduct, updateProduct,
  deleteProduct, toggleProduct
} from '../Controllers/productController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();
router.get('/public',     getPublicProducts);
router.get('/discounted', getDiscountedProducts);
router.get('/categories', getCategories);
router.get('/public/:id', getPublicProduct);
router.get('/',           protect, getAllProducts);
router.post('/',          protect, createProduct);
router.put('/:id',        protect, updateProduct);
router.delete('/:id',     protect, deleteProduct);
router.patch('/:id/toggle', protect, toggleProduct);
export default router;
