import mongoose from 'mongoose';

const accessFileSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  publicId: { type: String, default: '' },
  label: { type: String, default: '' },
  stepNumber: { type: Number, default: null },
  stepTitle: { type: String, default: '' },
  stepSummary: { type: String, default: '' },
  allowDownload: { type: Boolean, default: false },
  secureUrl: { type: String, required: true },
  originalFilename: { type: String, default: '' },
  downloadName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' },
  fileKind: {
    type: String,
    enum: ['document', 'video', 'audio', 'archive', 'image', 'other'],
    default: 'other',
  },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const manualPageSchema = new mongoose.Schema({
  pageId: { type: String, required: true },
  pageNumber: { type: Number, default: null },
  title: { type: String, default: '' },
  summary: { type: String, default: '' },
  content: { type: String, default: '' },
  mediaPublicId: { type: String, default: '' },
}, { _id: false });

const textMarkerSchema = new mongoose.Schema({
  itemId: { type: String, default: '' },
  sentenceIndex: { type: Number, default: null },
  sentenceText: { type: String, default: '' },
  updatedAt: { type: Date, default: null },
}, { _id: false });

const digitalWritingBlockTextStyleSchema = new mongoose.Schema({
  color: { type: String, default: '#374151' },
  fontSize: { type: Number, default: 16 },
  fontFamily: { type: String, default: 'Arial, sans-serif' },
  fontWeight: { type: String, default: '400' },
  fontStyle: { type: String, default: 'normal' },
  textTransform: { type: String, default: 'none' },
  textDecoration: { type: String, default: 'none' },
}, { _id: false });

const digitalWritingBlockPresentationSchema = new mongoose.Schema({
  labelMode: { type: String, enum: ['none', 'lesson'], default: 'none' },
  highlightColor: { type: String, default: '' },
  textStyle: {
    type: digitalWritingBlockTextStyleSchema,
    default: () => ({
      color: '#374151',
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      fontStyle: 'normal',
      textTransform: 'none',
      textDecoration: 'none',
    }),
  },
}, { _id: false });

const moduleItemBlockSchema = new mongoose.Schema({
  blockId: { type: String, default: '' },
  order: { type: Number, default: null },
  kind: { type: String, enum: ['text', 'file', 'link'], default: 'text' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  presentation: { type: digitalWritingBlockPresentationSchema, default: undefined },
  content: { type: String, default: '' },
  contentHtml: { type: String, default: '' },
  url: { type: String, default: '' },
  openInNewTab: { type: Boolean, default: true },
  allowDownload: { type: Boolean, default: false },
  secureUrl: { type: String, default: '' },
  publicId: { type: String, default: '' },
  originalFilename: { type: String, default: '' },
  downloadName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' },
  fileKind: {
    type: String,
    enum: ['document', 'video', 'audio', 'archive', 'image', 'other'],
    default: 'other',
  },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const moduleItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  order: { type: Number, default: null },
  kind: { type: String, enum: ['text', 'file'], default: 'text' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  content: { type: String, default: '' },
  blocks: { type: [moduleItemBlockSchema], default: [] },
  allowDownload: { type: Boolean, default: false },
  secureUrl: { type: String, default: '' },
  publicId: { type: String, default: '' },
  originalFilename: { type: String, default: '' },
  downloadName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' },
  fileKind: {
    type: String,
    enum: ['document', 'video', 'audio', 'archive', 'image', 'other'],
    default: 'other',
  },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  moduleNumber: { type: Number, default: null },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  items: { type: [moduleItemSchema], default: [] },
}, { _id: false });

const digitalTextStyleSchema = new mongoose.Schema({
  color: { type: String, default: '#111827' },
  fontSize: { type: Number, default: 16 },
  fontFamily: { type: String, default: 'Arial, sans-serif' },
  fontWeight: { type: String, default: '500' },
  fontStyle: { type: String, default: 'normal' },
  textTransform: { type: String, default: 'none' },
  textDecoration: { type: String, default: 'none' },
}, { _id: false });

const digitalContentsPageSchema = new mongoose.Schema({
  title: { type: String, default: 'Table of Contents' },
  subtitle: {
    type: String,
    default: 'Choose any module or lesson below to continue from the right place.',
  },
  titleStyle: { type: digitalTextStyleSchema, default: () => ({ color: '#111827', fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: '700', fontStyle: 'normal', textTransform: 'none', textDecoration: 'none' }) },
  subtitleStyle: { type: digitalTextStyleSchema, default: () => ({ color: '#4B5563', fontSize: 16, fontFamily: 'Arial, sans-serif', fontWeight: '500', fontStyle: 'normal', textTransform: 'none', textDecoration: 'none' }) },
}, { _id: false });

const accessLogSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  mode: { type: String, enum: ['inline', 'download'], default: 'inline' },
  deviceHash: { type: String, default: '' },
  userAgentHash: { type: String, default: '' },
  openedAt: { type: Date, default: Date.now },
}, { _id: false });

const approvedDeviceSchema = new mongoose.Schema({
  deviceHash: { type: String, required: true },
  label: { type: String, default: '' },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { _id: false });

const moduleProgressSchema = new mongoose.Schema({
  moduleId: { type: String, default: '' },
  assetId: { type: String, default: '' },
  label: { type: String, default: '' },
  stepNumber: { type: Number, default: null },
  moduleNumber: { type: Number, default: null },
  openedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  lastItemId: { type: String, default: '' },
  lastItemType: { type: String, enum: ['', 'text', 'file'], default: '' },
  lastItemTitle: { type: String, default: '' },
  lastPositionUpdatedAt: { type: Date, default: null },
  textMarker: { type: textMarkerSchema, default: null },
}, { _id: false });

const billingAuthorizationSchema = new mongoose.Schema({
  authorizationCode: { type: String, default: '' },
  signature: { type: String, default: '' },
  reusable: { type: Boolean, default: false },
  last4: { type: String, default: '' },
  bin: { type: String, default: '' },
  bank: { type: String, default: '' },
  brand: { type: String, default: '' },
  cardType: { type: String, default: '' },
  expMonth: { type: String, default: '' },
  expYear: { type: String, default: '' },
  email: { type: String, default: '' },
  customerCode: { type: String, default: '' },
  setupReference: { type: String, default: '' },
  setupChargedAmount: { type: Number, default: 0 },
}, { _id: false });

const billingEventSchema = new mongoose.Schema({
  reference: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['trial-started', 'charged', 'failed'], default: 'trial-started' },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const digitalAccessSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderId: { type: String, required: true },
  paymentRef: { type: String, default: '' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productImage: { type: String, default: '' },
  productDesc: { type: String, default: '' },
  supportEmail: { type: String, default: '' },
  supportWhatsApp: { type: String, default: '' },
  digitalContentsPage: { type: digitalContentsPageSchema, default: () => ({}) },
  digitalType: { type: String, default: 'other' },
  accessType: { type: String, enum: ['limited', 'lifetime'], default: 'limited' },
  accessMonths: { type: Number, default: null },
  expiresAt: { type: Date, default: null },
  customerId: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerName: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  digitalAccessKind: { type: String, enum: ['paid', 'free', 'trial'], default: 'paid' },
  trialStatus: { type: String, enum: ['none', 'trialing', 'converted', 'payment-failed'], default: 'none' },
  trialEndsAt: { type: Date, default: null },
  trialConvertedAt: { type: Date, default: null },
  billingAmount: { type: Number, default: 0 },
  billingCurrency: { type: String, default: 'GHS' },
  billingAuthorization: { type: billingAuthorizationSchema, default: null },
  lastChargeReference: { type: String, default: '' },
  lastChargeError: { type: String, default: '' },
  lastChargeAttemptAt: { type: Date, default: null },
  chargeAttempts: { type: Number, default: 0 },
  billingEvents: { type: [billingEventSchema], default: [] },
  isSeries: { type: Boolean, default: false },
  seriesTitle: { type: String, default: '' },
  seriesDescription: { type: String, default: '' },
  isCertified: { type: Boolean, default: false },
  certificateTitle: { type: String, default: '' },
  certificateDescription: { type: String, default: '' },
  certificateStatus: { type: String, enum: ['not-applicable', 'in-progress', 'eligible', 'requested', 'generated', 'declined'], default: 'not-applicable' },
  certificateRequestedAt: { type: Date, default: null },
  certificateGeneratedAt: { type: Date, default: null },
  certificateRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateRecord', default: null },
  modules: { type: [moduleSchema], default: [] },
  files: { type: [accessFileSchema], default: [] },
  manualPages: { type: [manualPageSchema], default: [] },
  moduleProgress: { type: [moduleProgressSchema], default: [] },
  maxDevices: { type: Number, default: 2 },
  approvedDevices: { type: [approvedDeviceSchema], default: [] },
  totalDownloads: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: null },
  accessLogs: { type: [accessLogSchema], default: [] },
}, { timestamps: true });

digitalAccessSchema.index({ order: 1, productId: 1 }, { unique: true });
digitalAccessSchema.index({ customerId: 1, status: 1, createdAt: -1 });

export default mongoose.model('DigitalAccess', digitalAccessSchema);
