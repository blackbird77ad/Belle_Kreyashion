import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  slug:     { type: String, unique: true, sparse: true, immutable: true },
  desc:     { type: String, default: '' },
  date:     { type: String, required: true },
  venue:    { type: String, required: true },
  price:    { type: Number, required: true },
  capacity: { type: Number, default: null },
  image:    { type: String, default: '' },
  partners: [{ type: String }],
  sponsors: [{ type: String }],
  active:   { type: Boolean, default: true },
}, { timestamps: true });

trainingSchema.pre('validate', function () {
  if (this.slug) return;
  const base = String(this.title || 'training')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'training';
  this.slug = `${base}-${String(this._id).slice(-8)}`;
});

export default mongoose.model('Training', trainingSchema);
