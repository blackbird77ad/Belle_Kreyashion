import mongoose from 'mongoose';
import {
  isPreviewableDigitalFile,
  isWatermarkEligibleDigitalFile,
  normalizeDigitalContentsPage,
  normalizeDigitalModules,
} from '../Utils/digitalModules.mjs';

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
  watermarkEnabled: { type: Boolean, default: false },
  watermarkText: { type: String, trim: true, default: '' },
});

const digitalManualPageSchema = new mongoose.Schema({
  pageNumber: { type: Number, default: null },
  title: { type: String, trim: true, default: '' },
  summary: { type: String, trim: true, default: '' },
  content: { type: String, default: '' },
  mediaPublicId: { type: String, default: '' },
});

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
  titleStyle: {
    type: digitalWritingBlockTextStyleSchema,
    default: () => ({
      color: '#374151',
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '600',
      fontStyle: 'normal',
      textTransform: 'none',
      textDecoration: 'none',
    }),
  },
  subtitleStyle: {
    type: digitalWritingBlockTextStyleSchema,
    default: () => ({
      color: '#6B7280',
      fontSize: 15,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '500',
      fontStyle: 'normal',
      textTransform: 'none',
      textDecoration: 'none',
    }),
  },
}, { _id: false });

const digitalLessonBlockSchema = new mongoose.Schema({
  blockId: { type: String, default: '' },
  kind: { type: String, enum: ['text', 'file', 'link'], default: 'text' },
  order: { type: Number, default: null },
  title: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
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
  watermarkEnabled: { type: Boolean, default: false },
  watermarkText: { type: String, trim: true, default: '' },
});

const digitalModuleItemSchema = new mongoose.Schema({
  kind: { type: String, enum: ['text', 'file'], default: 'text' },
  order: { type: Number, default: null },
  title: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  content: { type: String, default: '' },
  blocks: { type: [digitalLessonBlockSchema], default: [] },
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
  watermarkEnabled: { type: Boolean, default: false },
  watermarkText: { type: String, trim: true, default: '' },
});

const digitalModuleSchema = new mongoose.Schema({
  moduleNumber: { type: Number, default: null },
  title: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  items: { type: [digitalModuleItemSchema], default: [] },
});

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
  title: { type: String, trim: true, default: 'Table of Contents' },
  subtitle: {
    type: String,
    trim: true,
    default: 'Choose any module or lesson below to continue from the right place.',
  },
  titleStyle: { type: digitalTextStyleSchema, default: () => ({ color: '#111827', fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: '700', fontStyle: 'normal', textTransform: 'none', textDecoration: 'none' }) },
  subtitleStyle: { type: digitalTextStyleSchema, default: () => ({ color: '#4B5563', fontSize: 16, fontFamily: 'Arial, sans-serif', fontWeight: '500', fontStyle: 'normal', textTransform: 'none', textDecoration: 'none' }) },
}, { _id: false });

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
    trim: true,
    default: null,
  },
  digitalAccessKind: {
    type: String,
    enum: ['paid', 'free', 'trial'],
    default: 'paid',
  },
  digitalSkillLevel: {
    type: String,
    trim: true,
    default: 'all-levels',
  },
  digitalFormat: {
    type: String,
    trim: true,
    default: null,
  },
  digitalDuration: {
    type: String,
    trim: true,
    default: null,
  },
  digitalTopics: {
    type: [{ type: String, trim: true }],
    default: [],
  },
  digitalInclusions: {
    type: [{ type: String, trim: true }],
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
  digitalContentsPage: { type: digitalContentsPageSchema, default: () => ({}) },
  digitalModules: { type: [digitalModuleSchema], default: [] },
  digitalManualPages: { type: [digitalManualPageSchema], default: [] },
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
    this.digitalContentsPage = normalizeDigitalContentsPage(this.digitalContentsPage || {});
    this.digitalModules = normalizeDigitalModules(Array.isArray(this.digitalModules) ? this.digitalModules : []);
    this.digitalFiles = (Array.isArray(this.digitalFiles) ? this.digitalFiles : [])
      .map((file, index) => ({
        ...file,
        label: String(file.label || file.originalFilename || `Digital File ${index + 1}`).trim(),
        stepNumber: file.stepNumber !== '' && file.stepNumber !== undefined && file.stepNumber !== null
          ? Number(file.stepNumber)
          : null,
        stepTitle: String(file.stepTitle || '').trim(),
        stepSummary: String(file.stepSummary || '').trim(),
        allowDownload: !!file.allowDownload || !isPreviewableDigitalFile(file),
        watermarkEnabled: isWatermarkEligibleDigitalFile(file) && (!!file.allowDownload || !isPreviewableDigitalFile(file))
          ? !!file.watermarkEnabled
          : false,
        watermarkText: isWatermarkEligibleDigitalFile(file) && file.watermarkEnabled && (!!file.allowDownload || !isPreviewableDigitalFile(file))
          ? String(file.watermarkText || '').trim().slice(0, 120)
          : '',
      }))
      .filter((file) => file.secureUrl)
      .sort((a, b) => {
        const aStep = a.stepNumber ?? Number.MAX_SAFE_INTEGER;
        const bStep = b.stepNumber ?? Number.MAX_SAFE_INTEGER;
        if (aStep !== bStep) return aStep - bStep;
        return String(a.label || '').localeCompare(String(b.label || ''));
      });
    this.digitalManualPages = (Array.isArray(this.digitalManualPages) ? this.digitalManualPages : [])
      .map((page) => ({
        ...page,
        pageNumber: page.pageNumber !== '' && page.pageNumber !== undefined && page.pageNumber !== null
          ? Number(page.pageNumber)
          : null,
        title: String(page.title || '').trim(),
        summary: String(page.summary || '').trim(),
        content: String(page.content || '').trim(),
        mediaPublicId: String(page.mediaPublicId || '').trim(),
      }))
      .filter((page) => page.title || page.summary || page.content || page.mediaPublicId)
      .sort((a, b) => {
        const aPage = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
        const bPage = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
        if (aPage !== bPage) return aPage - bPage;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
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
    this.digitalContentsPage = undefined;
    this.digitalModules = [];
    this.digitalManualPages = [];
    this.digitalFiles = [];
  }
});

export default mongoose.model('Product', productSchema);
