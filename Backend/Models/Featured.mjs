import mongoose from 'mongoose';

const featuredSchema = new mongoose.Schema({
  brandName:        { type: String, required: true },
  productName:      { type: String, required: true },
  desc:             { type: String, default: '' },
  image:            { type: String, default: '' },
  price:            { type: Number, default: null },
  stock:            { type: Number, default: null },
  contactInfo:      { type: String, default: '' },
  plan:             { type: Number, required: true },
  subscriptionStart:{ type: Date, default: Date.now },
  subscriptionEnd:  { type: Date, required: true },
  active:           { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Featured', featuredSchema);
