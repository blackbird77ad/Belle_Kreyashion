import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId:   { type: String, unique: true },
  type:        { type: String, enum: ['training', 'consultation'], required: true },
  trainingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Training', default: null },
  customer:    { name: String, phone: String },
  amount:      Number,
  paymentRef:  String,
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  notes:       { type: String, default: '' },
}, { timestamps: true });

bookingSchema.pre('save', async function () {
  if (!this.isNew || this.bookingId) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model('Booking').countDocuments();
  this.bookingId = `BK-${year}-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Booking', bookingSchema);
