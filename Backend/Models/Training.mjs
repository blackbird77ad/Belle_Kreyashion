import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  desc:     { type: String, default: '' },
  date:     { type: String, required: true },
  venue:    { type: String, required: true },
  price:    { type: Number, required: true },
  capacity: { type: Number, default: null },
  image:    { type: String, default: '' },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Training', trainingSchema);
