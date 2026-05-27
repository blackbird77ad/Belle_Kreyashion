import { Router } from 'express';
import {
  bulkGenerateCertificates,
  createCertificateWhatsAppShare,
  createCertificate,
  createCertificateTemplate,
  deleteCertificate,
  deleteCertificateTemplate,
  downloadCertificatePdf,
  downloadSharedCertificatePdf,
  getCertificates,
  getCertificateTemplates,
  sendCertificateToLearner,
  updateCertificateTemplate,
  updateCertificate,
} from '../Controllers/certificateController.mjs';
import { protect } from '../Middlewares/auth.mjs';

const router = Router();

router.get('/templates', protect, getCertificateTemplates);
router.post('/templates', protect, createCertificateTemplate);
router.put('/templates/:id', protect, updateCertificateTemplate);
router.delete('/templates/:id', protect, deleteCertificateTemplate);
router.post('/bulk-generate', protect, bulkGenerateCertificates);
router.post('/:id/send-email', protect, sendCertificateToLearner);
router.post('/:id/share-whatsapp', protect, createCertificateWhatsAppShare);
router.get('/:id/download', protect, downloadCertificatePdf);
router.get('/:id/share-download', downloadSharedCertificatePdf);
router.get('/', protect, getCertificates);
router.post('/', protect, createCertificate);
router.put('/:id', protect, updateCertificate);
router.delete('/:id', protect, deleteCertificate);

export default router;
