import mongoose from 'mongoose';

const abandonedCartSchema = new mongoose.Schema({
  name:      String,
  phone:     String,
  items:     [{ productId: String, name: String, qty: Number, price: Number }],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('AbandonedCart', abandonedCartSchema);
