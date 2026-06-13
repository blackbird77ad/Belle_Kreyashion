import mongoose from 'mongoose';

const abandonedCartSchema = new mongoose.Schema({
  name:       String,
  phone:      String,
  email:      { type: String, default: '' },
  items:      [{
    productId: String,
    slug: { type: String, default: '' },
    name: String,
    qty: Number,
    price: Number,
    image: { type: String, default: '' },
    variant: { type: String, default: '' },
    isWholesale: { type: Boolean, default: false },
    isDigital: { type: Boolean, default: false },
    digitalAccessKind: { type: String, default: '' },
  }],
  followedUp: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'recovered', 'converted', 'unsubscribed'], default: 'active' },
  recoveryTokenHash: { type: String, default: '', index: true },
  recoveryToken: { type: String, default: '' },
  reminderCount: { type: Number, default: 0 },
  lastReminderAt: { type: Date, default: null },
  nextReminderAt: { type: Date, default: null },
  recoveredAt: { type: Date, default: null },
  sourceAttribution: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('AbandonedCart', abandonedCartSchema);
