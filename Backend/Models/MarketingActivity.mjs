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

const productSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  category: { type: String, default: '' },
  isDigital: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const marketingActivitySchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: {
    type: String,
    required: true,
    enum: ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'contact_click', 'form_submission'],
  },
  sessionId: { type: String, required: true, index: true },
  pagePath: { type: String, default: '' },
  pageTitle: { type: String, default: '' },
  product: { type: productSchema, default: null },
  items: { type: [productSchema], default: [] },
  itemCount: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  currency: { type: String, default: 'GHS' },
  channel: { type: String, default: '' },
  sourceAttribution: { type: sourceAttributionSchema, default: null },
}, { timestamps: true });

marketingActivitySchema.index({ createdAt: -1, eventType: 1 });
marketingActivitySchema.index({ 'sourceAttribution.utmCampaign': 1, createdAt: -1 });
marketingActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

export default mongoose.model('MarketingActivity', marketingActivitySchema);
