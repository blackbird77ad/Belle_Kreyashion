import { Router } from 'express';
import { getPublicTraining, getAllTraining, createTraining, updateTraining, deleteTraining, toggleTraining, uploadTrainingAsset, verifyAndCreateBooking, getAllBookings, getCustomerBookings } from '../Controllers/trainingController.mjs';
import { protect } from '../Middlewares/auth.mjs';
import { uploadTrainingImage } from '../Middlewares/upload.mjs';
const router = Router();
router.get('/public', getPublicTraining);
router.get('/', protect, getAllTraining);
router.post('/upload', protect, (req, res) => {
  uploadTrainingImage(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    uploadTrainingAsset(req, res);
  });
});
router.post('/', protect, createTraining);
router.put('/:id', protect, updateTraining);
router.delete('/:id', protect, deleteTraining);
router.patch('/:id/toggle', protect, toggleTraining);
router.post('/book/verify', verifyAndCreateBooking);
router.get('/bookings', protect, getAllBookings);
router.get('/bookings/customer/:phone', getCustomerBookings);
export default router;
