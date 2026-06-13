import mongoose from 'mongoose';

const sourceAttributionSchema = new mongoose.Schema({
  sourcePage: { type: String, default: '' },
  sourcePath: { type: String, default: '' },
  sourceQuery: { type: String, default: '' },
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmTerm: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  gclid: { type: String, default: '' },
  fbclid: { type: String, default: '' },
  ttclid: { type: String, default: '' },
  msclkid: { type: String, default: '' },
  landingPage: { type: String, default: '' },
  referrer: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  firstSeenAt: { type: String, default: '' },
  lastSeenAt: { type: String, default: '' },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  slug: { type: String, default: '' },
  name: String,
  brand: { type: String, default: 'Belle Kreyashon' },
  category: { type: String, default: '' },
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
  sourceAttribution: { type: sourceAttributionSchema, default: null },
}, { _id: false });

const trialChargeSchema = new mongoose.Schema({
  reference: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['trial-started', 'charged', 'failed'], default: 'trial-started' },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const paymentEventSchema = new mongoose.Schema({
  type: { type: String, default: '' },
  source: { type: String, enum: ['checkout', 'browser', 'webhook', 'admin', 'system'], default: 'system' },
  status: { type: String, default: '' },
  message: { type: String, default: '' },
  reference: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  channel: { type: String, default: '' },
  occurredAt: { type: Date, default: Date.now },
}, { _id: false });

const couponSnapshotSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  code: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, enum: ['percent', 'fixed', 'free_shipping', ''], default: '' },
  value: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  campaignName: { type: String, default: '' },
  referralCode: { type: String, default: '' },
  redeemedAt: { type: Date, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  customer: {
    name: String,
    phone: String,
    email: { type: String, default: '' },
    customerId: String,
    address: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    isGuest: { type: Boolean, default: false },
  },
  items: [orderItemSchema],
  sourceAttribution: { type: sourceAttributionSchema, default: null },
  sourcePages: [{ type: String }],
  subtotal: Number,
  discountTotal: { type: Number, default: 0 },
  coupon: { type: couponSnapshotSchema, default: null },
  fulfillment: {
    type: String,
    enum: ['pickup', 'delivery', 'arranged-delivery', 'international', 'digital'],
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
  paymentRef: { type: String, unique: true, sparse: true },
  paymentStatus: { type: String, enum: ['pending', 'awaiting-verification', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['paystack', 'card', 'mobile_money', 'bank_transfer', 'free'], default: 'paystack' },
  paymentChannel: { type: String, default: '' },
  paymentProvider: { type: String, default: 'paystack' },
  expectedPaymentAmount: { type: Number, default: 0 },
  paidAt: { type: Date, default: null },
  finalizedAt: { type: Date, default: null },
  finalizationState: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  finalizationError: { type: String, default: '' },
  inventoryCommitted: { type: Boolean, default: false },
  digitalAccessGranted: { type: Boolean, default: false },
  notificationsSent: { type: Boolean, default: false },
  paymentEvents: { type: [paymentEventSchema], default: [] },
  bankTransfer: {
    accountName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    instructions: { type: String, default: '' },
    proofUrl: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
  },
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
