import mongoose from 'mongoose';

const sourceAttributionSchema = new mongoose.Schema({
  sourcePage: { type: String, default: '' },
  sourcePath: { type: String, default: '' },
  sourceQuery: { type: String, default: '' },
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmTerm: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  gclid: { type: String, default: '' },
  fbclid: { type: String, default: '' },
  ttclid: { type: String, default: '' },
  msclkid: { type: String, default: '' },
  landingPage: { type: String, default: '' },
  referrer: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  firstSeenAt: { type: String, default: '' },
  lastSeenAt: { type: String, default: '' },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId:   { type: String, unique: true },
  type:             { type: String, enum: ['training', 'consultation'], required: true },
  trainingId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Training', default: null },
  trainingTitle:    { type: String, default: '' },
  consultationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
  consultationTitle:{ type: String, default: '' },
  customer:    { name: String, phone: String },
  amount:      Number,
  paymentRef:  String,
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  notes:       { type: String, default: '' },
  sourceAttribution: { type: sourceAttributionSchema, default: null },
}, { timestamps: true });

bookingSchema.pre('save', async function () {
  if (!this.isNew || this.bookingId) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model('Booking').countDocuments();
  this.bookingId = `BK-${year}-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Booking', bookingSchema);
