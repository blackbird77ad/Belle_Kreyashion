import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:        String,
  qty:         Number,
  price:       Number,
  isWholesale: { type: Boolean, default: false },
  variant:     { type: String, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true },
  customer:      { name: String, phone: String, customerId: String },
  items:         [orderItemSchema],
  subtotal:      Number,
  deliveryZone:  String,
  deliveryFee:   Number,
  total:         Number,
  orderType:     { type: String, enum: ['standard', 'preorder', 'wholesale', 'international'], default: 'standard' },
  isInternational: { type: Boolean, default: false },
  paymentRef:    String,
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true });

orderSchema.pre('save', async function () {
  if (!this.isNew || this.orderId) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model('Order').countDocuments();
  this.orderId = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Order', orderSchema);
