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
  orderId:    { type: String, unique: true },
  customer: {
    name:       String,
    phone:      String,
    customerId: String,
    address:    { type: String, default: '' },
  },
  items:         [orderItemSchema],
  subtotal:      Number,
  fulfillment:   { type: String, enum: ['pickup', 'delivery', 'international'], default: 'delivery' },
  deliveryZone:  { type: String, default: '' },
  deliveryFee:   { type: Number, default: 0 },
  total:         Number,
  orderType:     { type: String, enum: ['standard', 'preorder', 'wholesale', 'international'], default: 'standard' },
  paymentRef:    String,
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  status:        { type: String, enum: ['new', 'processing', 'delivery-ongoing', 'delivered', 'cancelled'], default: 'new' },
  deliveredAt:   { type: Date, default: null },
}, { timestamps: true });

orderSchema.pre('save', async function () {
  if (!this.isNew || this.orderId) return;
  const year  = new Date().getFullYear();
  const count = await mongoose.model('Order').countDocuments();
  this.orderId = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Order', orderSchema);
