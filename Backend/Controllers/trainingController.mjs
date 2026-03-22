import Training from '../Models/Training.mjs';
import Booking from '../Models/Booking.mjs';
import axios from 'axios';

const WHATSAPP = process.env.WHATSAPP_NUMBER;
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

export const getPublicTraining = async (req, res) => {
  try {
    const events = await Training.find({ active: true }).sort({ date: 1 });
    res.json(events);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllTraining = async (req, res) => {
  try {
    const events = await Training.find().sort({ date: 1 });
    res.json(events);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createTraining = async (req, res) => {
  try {
    const event = await Training.create(req.body);
    res.status(201).json(event);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateTraining = async (req, res) => {
  try {
    const event = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteTraining = async (req, res) => {
  try {
    await Training.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const verifyAndCreateBooking = async (req, res) => {
  try {
    const { transaction_id, bookingData } = req.body;
    const verify = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );
    if (verify.data.data.status !== 'successful') {
      return res.status(400).json({ message: 'Payment not successful' });
    }
    const booking = await Booking.create({
      ...bookingData,
      paymentRef: transaction_id,
      paymentStatus: 'paid',
    });

    const msg = encodeURIComponent(
`📅 NEW BOOKING — Belle Kreyashon
━━━━━━━━━━━━━━━━━━━
Booking ID: ${booking.bookingId}
Type: ${booking.type.toUpperCase()}
Customer: ${booking.customer.name}
Phone: ${booking.customer.phone}
Amount Paid: GHS ${booking.amount}
Payment Ref: ${transaction_id}
━━━━━━━━━━━━━━━━━━━
Payment: CONFIRMED ✅`
    );

    res.json({
      booking,
      whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
      callUrl: `tel:+${WHATSAPP}`,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).populate('trainingId');
    res.json(bookings);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
