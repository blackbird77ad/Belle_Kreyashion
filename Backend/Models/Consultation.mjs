import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  slug:     { type: String, unique: true, sparse: true, immutable: true },
  desc:     { type: String, default: '' },
  price:    { type: Number, default: 0 },
  duration: { type: String, default: '' },
  validity: { type: String, default: '' },
  isFree:   { type: Boolean, default: false },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

consultationSchema.pre('validate', function () {
  if (this.slug) return;
  const base = String(this.title || 'consultation')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'consultation';
  this.slug = `${base}-${String(this._id).slice(-8)}`;
});

export default mongoose.model('Consultation', consultationSchema);
