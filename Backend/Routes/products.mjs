import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getCategories,
  getDigitalProductOptions,
  getDiscountedProducts,
  getGoogleMerchantFeed,
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
  DIGITAL_UPLOAD_MAX_MB,
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
    if (err) {
      const fileTooLarge = err.code === 'LIMIT_FILE_SIZE';
      return res.status(fileTooLarge ? 413 : 400).json({
        message: fileTooLarge
          ? `File too large. Lesson and digital media can be up to ${DIGITAL_UPLOAD_MAX_MB} MB per file.`
          : err.message,
      });
    }
    if (!req.files?.length) return res.status(400).json({ message: 'No digital files uploaded' });

    try {
      const files = await uploadDigitalFilesToCloudinary(req.files);
      res.json({ files });
    } catch (uploadErr) {
      const errorMessage = String(uploadErr.message || '');
      const sizeMatch = errorMessage.match(/file size (?:is )?too large.*?got\s+(\d+).*?maximum is\s+(\d+)/i);
      const cloudinaryLimitReached = Number(uploadErr.http_code) === 413 || !!sizeMatch;
      const actualMb = sizeMatch ? Math.ceil(Number(sizeMatch[1]) / (1024 * 1024)) : null;
      const maximumMb = sizeMatch ? Math.floor(Number(sizeMatch[2]) / (1024 * 1024)) : DIGITAL_UPLOAD_MAX_MB;
      res.status(cloudinaryLimitReached ? 413 : 502).json({
        message: cloudinaryLimitReached
          ? `Cloudinary's current account limit is ${maximumMb} MB per file${actualMb ? `, but this file is ${actualMb} MB` : ''}. Chunked uploading cannot override that account limit. Increase the Cloudinary upload limit, reduce or split the video, or add an unlisted YouTube/Vimeo link to the lesson.`
          : errorMessage || 'Could not store the lesson media in Cloudinary.',
      });
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
router.get('/feed/google-merchant.xml', getGoogleMerchantFeed);
router.get('/public/:id', getPublicProduct);

router.get('/', protect, getAllProducts);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.patch('/:id/toggle', protect, toggleProduct);

export default router;
