import mongoose from 'mongoose';
import {
  DIGITAL_DURATIONS,
  DIGITAL_FORMATS,
  DIGITAL_INCLUSIONS,
  DIGITAL_SKILL_LEVELS,
  DIGITAL_TOPICS,
} from '../Constants/digitalProductOptions.mjs';

const variantSchema = new mongoose.Schema({
  name: { type: String },
  price: { type: Number },
}, { _id: false });

const discountSchema = new mongoose.Schema({
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, default: 0 },
  label: { type: String, default: '' },
  limitCustomers: { type: Number, default: null },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
}, { _id: false });

const digitalFileSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: '' },
  stepNumber: { type: Number, default: null },
  stepTitle: { type: String, trim: true, default: '' },
  stepSummary: { type: String, trim: true, default: '' },
  allowDownload: { type: Boolean, default: false },
  secureUrl: { type: String, required: true },
  publicId: { type: String, required: true },
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
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  desc: { type: String, default: '' },
  category: { type: String, required: true },
  images: [{ type: String }],
  retailPrice: { type: Number, required: true },
  wholesalePrice: { type: Number, default: null },
  wholesaleMinQty: { type: Number, default: null },
  variants: [variantSchema],
  stock: { type: Number, default: null },
  isPreOrder: { type: Boolean, default: false },
  preOrderType: { type: String, enum: ['deposit', 'full', null, ''], default: null },
  depositPercent: { type: Number, default: null },
  discount: { type: discountSchema, default: null },
  available: { type: Boolean, default: true },
  isPartner: { type: Boolean, default: false },
  partnerBrand: { type: String, default: '' },
  partnerContact: { type: String, default: '' },
  partnerPlanMonths: { type: Number, default: null },
  partnerSubEnd: { type: Date, default: null },
  featured: { type: Boolean, default: false },
  fastSelling: { type: Boolean, default: false },
  isDigital: { type: Boolean, default: false },
  digitalType: {
    type: String,
    enum: ['document', 'video', 'audio', 'bundle', 'template', 'mixed', 'other', null, ''],
    default: null,
  },
  digitalAccessKind: {
    type: String,
    enum: ['paid', 'free', 'trial'],
    default: 'paid',
  },
  digitalSkillLevel: {
    type: String,
    enum: [...DIGITAL_SKILL_LEVELS, null, ''],
    default: 'all-levels',
  },
  digitalFormat: {
    type: String,
    enum: [...DIGITAL_FORMATS, null, ''],
    default: null,
  },
  digitalDuration: {
    type: String,
    enum: [...DIGITAL_DURATIONS, null, ''],
    default: null,
  },
  digitalTopics: {
    type: [{ type: String, enum: DIGITAL_TOPICS }],
    default: [],
  },
  digitalInclusions: {
    type: [{ type: String, enum: DIGITAL_INCLUSIONS }],
    default: [],
  },
  freeTrialDays: { type: Number, default: 0 },
  isSeries: { type: Boolean, default: false },
  seriesTitle: { type: String, default: '' },
  seriesDescription: { type: String, default: '' },
  isCertified: { type: Boolean, default: false },
  certificateTitle: { type: String, default: '' },
  certificateDescription: { type: String, default: '' },
  accessMode: {
    type: String,
    enum: ['customer_choice', 'limited', 'lifetime', null, ''],
    default: 'customer_choice',
  },
  limitedAccessMonths: { type: Number, default: 6 },
  accessNote: { type: String, default: '' },
  supportEmail: { type: String, default: '' },
  supportWhatsApp: { type: String, default: '' },
  digitalFiles: { type: [digitalFileSchema], default: [] },
}, { timestamps: true });

productSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = `${this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
  }

  if (this.preOrderType === '') this.preOrderType = null;
  if (this.digitalType === '') this.digitalType = null;
  if (this.digitalFormat === '') this.digitalFormat = null;
  if (this.digitalDuration === '') this.digitalDuration = null;
  if (this.accessMode === '') this.accessMode = 'customer_choice';

  if (this.isDigital) {
    this.category = 'Digital Products';
    this.stock = null;
    this.wholesalePrice = null;
    this.wholesaleMinQty = null;
    this.variants = [];
    this.isPreOrder = false;
    this.preOrderType = null;
    this.depositPercent = null;
    this.accessMode = this.accessMode || 'customer_choice';
    this.limitedAccessMonths = Number(this.limitedAccessMonths) > 0 ? Number(this.limitedAccessMonths) : 6;
    this.digitalAccessKind = this.digitalAccessKind || 'paid';
    this.digitalSkillLevel = this.digitalSkillLevel || 'all-levels';
    this.digitalFormat = this.digitalFormat || null;
    this.digitalDuration = this.digitalDuration || null;
    this.digitalTopics = Array.isArray(this.digitalTopics) ? this.digitalTopics : [];
    this.digitalInclusions = Array.isArray(this.digitalInclusions) ? this.digitalInclusions : [];
    this.freeTrialDays = this.digitalAccessKind === 'trial'
      ? Math.max(1, Number(this.freeTrialDays) || 7)
      : 0;
    if (this.digitalAccessKind === 'free') {
      this.retailPrice = 0;
      this.discount = null;
    }
    if (!this.isSeries) {
      this.seriesTitle = '';
      this.seriesDescription = '';
    }
    if (!this.isCertified) {
      this.certificateTitle = '';
      this.certificateDescription = '';
    }
    this.supportEmail = String(this.supportEmail || '').trim().toLowerCase();
    this.supportWhatsApp = String(this.supportWhatsApp || '').trim();
  } else {
    this.digitalAccessKind = 'paid';
    this.digitalSkillLevel = 'all-levels';
    this.digitalFormat = null;
    this.digitalDuration = null;
    this.digitalTopics = [];
    this.digitalInclusions = [];
    this.freeTrialDays = 0;
    this.isSeries = false;
    this.seriesTitle = '';
    this.seriesDescription = '';
    this.isCertified = false;
    this.certificateTitle = '';
    this.certificateDescription = '';
    this.accessMode = 'customer_choice';
    this.limitedAccessMonths = 6;
    this.accessNote = '';
    this.supportEmail = '';
    this.supportWhatsApp = '';
    this.digitalFiles = [];
  }
});

export default mongoose.model('Product', productSchema);
