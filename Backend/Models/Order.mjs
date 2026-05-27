import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  qty: Number,
  price: Number,
  isWholesale: { type: Boolean, default: false },
  isDigital: { type: Boolean, default: false },
  digitalAccessKind: { type: String, enum: ['paid', 'free', 'trial', null], default: null },
  trialDays: { type: Number, default: null },
  trialChargeAmount: { type: Number, default: null },
  accessType: { type: String, enum: ['limited', 'lifetime', null], default: null },
  accessMonths: { type: Number, default: null },
  variant: { type: String, default: null },
}, { _id: false });

const trialChargeSchema = new mongoose.Schema({
  reference: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['trial-started', 'charged', 'failed'], default: 'trial-started' },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  customer: {
    name: String,
    phone: String,
    email: { type: String, default: '' },
    customerId: String,
    address: { type: String, default: '' },
  },
  items: [orderItemSchema],
  subtotal: Number,
  fulfillment: {
    type: String,
    enum: ['pickup', 'delivery', 'international', 'digital'],
    default: 'delivery',
  },
  deliveryZone: { type: String, default: '' },
  deliveryFee: { type: Number, default: 0 },
  total: Number,
  orderType: {
    type: String,
    enum: ['standard', 'preorder', 'wholesale', 'international', 'digital'],
    default: 'standard',
  },
  paymentRef: String,
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentPurpose: { type: String, enum: ['purchase', 'trial_setup', 'free_claim'], default: 'purchase' },
  paystackChargedAmount: { type: Number, default: 0 },
  billingState: { type: String, enum: ['not-applicable', 'trialing', 'paid', 'failed'], default: 'not-applicable' },
  trialChargeHistory: { type: [trialChargeSchema], default: [] },
  status: {
    type: String,
    enum: ['new', 'processing', 'delivery-ongoing', 'delivered', 'cancelled'],
    default: 'new',
  },
  deliveredAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.pre('save', async function () {
  if (!this.isNew || this.orderId) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model('Order').countDocuments();
  this.orderId = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Order', orderSchema);
