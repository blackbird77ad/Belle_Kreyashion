import mongoose from 'mongoose';

const consultationSettingsSchema = new mongoose.Schema({
  paidFee:    { type: Number, default: 0 },
  active:     { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('ConsultationSettings', consultationSettingsSchema);
