import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  desc:     { type: String, default: '' },
  price:    { type: Number, default: 0 },
  duration: { type: String, default: '' },
  validity: { type: String, default: '' },
  isFree:   { type: Boolean, default: false },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Consultation', consultationSchema);
