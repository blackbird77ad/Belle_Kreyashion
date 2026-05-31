import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getCategories,
  getDigitalProductOptions,
  getDiscountedProducts,
  getPublicProduct,
  getPublicProducts,
  toggleProduct,
  updateProduct,
} from '../Controllers/productController.mjs';
import {
  createDigitalAssetAccessUrl,
  getCustomerDigitalLibrary,
  markDigitalModuleComplete,
  requestDigitalCertificate,
  serveDigitalAsset,
  updateDigitalModuleProgress,
} from '../Controllers/digitalAccessController.mjs';
import { protect, protectCustomer } from '../Middlewares/auth.mjs';
import {
  uploadDigitalFiles,
  uploadDigitalFilesToCloudinary,
  uploadImages,
} from '../Middlewares/upload.mjs';

const router = Router();

router.post('/upload', protect, (req, res) => {
  uploadImages(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.files?.length) return res.status(400).json({ message: 'No images uploaded' });
    const urls = req.files.map((file) => file.path);
    res.json({ urls });
  });
});

router.post('/upload-digital', protect, (req, res) => {
  uploadDigitalFiles(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.files?.length) return res.status(400).json({ message: 'No digital files uploaded' });

    try {
      const files = await uploadDigitalFilesToCloudinary(req.files);
      res.json({ files });
    } catch (uploadErr) {
      res.status(500).json({ message: uploadErr.message });
    }
  });
});

router.get('/digital/library', protectCustomer, getCustomerDigitalLibrary);
router.post('/digital/library/:grantId/assets/:assetId', protectCustomer, createDigitalAssetAccessUrl);
router.get('/digital/library/:grantId/assets/:assetId/serve', serveDigitalAsset);
router.post('/digital/library/:grantId/modules/:moduleId/items/:itemId/progress', protectCustomer, updateDigitalModuleProgress);
router.post('/digital/library/:grantId/modules/:moduleId/complete', protectCustomer, markDigitalModuleComplete);
router.post('/digital/library/:grantId/assets/:assetId/complete', protectCustomer, markDigitalModuleComplete);
router.post('/digital/library/:grantId/certificate-request', protectCustomer, requestDigitalCertificate);

router.get('/public', getPublicProducts);
router.get('/discounted', getDiscountedProducts);
router.get('/categories', getCategories);
router.get('/digital/options', getDigitalProductOptions);
router.get('/public/:id', getPublicProduct);

router.get('/', protect, getAllProducts);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.patch('/:id/toggle', protect, toggleProduct);

export default router;
