import Training from '../Models/Training.mjs';
import Booking from '../Models/Booking.mjs';
import axios from 'axios';

const WHATSAPP = process.env.WHATSAPP_NUMBER;

const convertDrive = (url) => {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
};

export const getPublicTraining = async (req, res) => {
  try { res.json(await Training.find({ active: true }).sort({ date: 1 })); }
  catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllTraining = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { $or: [
      { title: { $regex: search, $options: 'i' } },
      { venue: { $regex: search, $options: 'i' } },
    ]} : {};
    res.json(await Training.find(query).sort({ date: 1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createTraining = async (req, res) => {
  try {
    const body = { ...req.body, image: convertDrive(req.body.image), price: Number(req.body.price), capacity: req.body.capacity ? Number(req.body.capacity) : null };
    res.status(201).json(await Training.create(body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateTraining = async (req, res) => {
  try {
    const body = { ...req.body, image: convertDrive(req.body.image) };
    res.json(await Training.findByIdAndUpdate(req.params.id, body, { new: true }));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteTraining = async (req, res) => {
  try { await Training.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch { res.status(500).json({ message: 'Server error' }); }
};

export const toggleTraining = async (req, res) => {
  try {
    const event = await Training.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Not found' });
    event.active = !event.active;
    await event.save();
    res.json(event);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const verifyAndCreateBooking = async (req, res) => {
  try {
    const { bookingData, paymentRef } = req.body;
    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

    // Verify with Paystack
    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${paymentRef}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );
    const txn = verify.data?.data;
    if (!txn || txn.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const booking = await Booking.create({ ...bookingData, paymentRef, paymentStatus: 'paid' });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const msg = encodeURIComponent(
`📅 NEW BOOKING — Belle Kreyashon
━━━━━━━━━━━━━━
Booking ID: ${booking.bookingId}
Type: ${booking.type === 'training' ? '🎓 Training' : '💬 Consultation'}
${bookingData.trainingTitle ? `Session: ${bookingData.trainingTitle}` : `Consultation: ${bookingData.consultationTitle}`}
Customer: ${booking.customer.name}
Phone: ${booking.customer.phone}
Date: ${dateStr} at ${timeStr}
Amount: GHS ${booking.amount}
━━━━━━━━━━━━━━
Payment: CONFIRMED ✅
Ref: ${paymentRef}`
    );

    res.json({
      booking,
      whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
      callUrl: `tel:+${WHATSAPP}`,
    });
  } catch (err) {
    console.error('Booking error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { $or: [
      { 'customer.name':  { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
      { bookingId:        { $regex: search, $options: 'i' } },
      { trainingTitle:    { $regex: search, $options: 'i' } },
      { consultationTitle:{ $regex: search, $options: 'i' } },
    ]} : {};
    res.json(await Booking.find(query).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 'customer.phone': req.params.phone }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
