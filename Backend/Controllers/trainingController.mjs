import Training from '../Models/Training.mjs';
import Booking from '../Models/Booking.mjs';
import axios from 'axios';
import { sendMetaBookingEvent } from '../Services/metaConversionsService.mjs';
import { sendServerBookingEvent } from '../Services/serverTagService.mjs';

const WHATSAPP = process.env.WHATSAPP_NUMBER;

const getMarketingRequestContext = (req, browserData = {}) => ({
  browserData: browserData || {},
  clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
  userAgent: req.get('user-agent') || '',
});

const convertDrive = (url) => {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
};

const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const normalizeTrainingBody = (body, existing = {}) => ({
  ...body,
  title: body.title?.trim(),
  desc: body.desc?.trim() || '',
  date: body.date?.trim(),
  venue: body.venue?.trim(),
  image: convertDrive(body.image?.trim?.() || body.image || existing.image || ''),
  price: Number(body.price),
  capacity: body.capacity === '' || body.capacity === undefined || body.capacity === null
    ? null
    : Number(body.capacity),
  partners: parseList(body.partners),
  sponsors: parseList(body.sponsors),
  active: parseBoolean(body.active, existing.active ?? true),
});

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
      { partners: { $elemMatch: { $regex: search, $options: 'i' } } },
      { sponsors: { $elemMatch: { $regex: search, $options: 'i' } } },
    ]} : {};
    res.json(await Training.find(query).sort({ date: 1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createTraining = async (req, res) => {
  try {
    const body = normalizeTrainingBody(req.body);
    res.status(201).json(await Training.create(body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateTraining = async (req, res) => {
  try {
    const existing = await Training.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const body = normalizeTrainingBody(req.body, existing);
    res.json(await Training.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const uploadTrainingAsset = async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ message: 'No image uploaded' });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
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

    if (bookingData?.marketingConsent !== false) {
      sendMetaBookingEvent(booking, getMarketingRequestContext(req, bookingData?.browserData)).catch((metaErr) => {
        console.error('Meta booking tracking error:', metaErr.message);
      });
      sendServerBookingEvent(booking).catch((tagErr) => {
        console.error('Server tag booking tracking error:', tagErr.message);
      });
    }

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
