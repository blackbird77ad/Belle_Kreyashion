import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name:  { type: String },
  price: { type: Number },
}, { _id: false });

const discountSchema = new mongoose.Schema({
  type:          { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value:         { type: Number, default: 0 },
  label:         { type: String, default: '' },
  limitCustomers:{ type: Number, default: null },
  startDate:     { type: Date, default: null },
  endDate:       { type: Date, default: null },
  usedCount:     { type: Number, default: 0 },
  active:        { type: Boolean, default: false },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  slug:            { type: String, unique: true, sparse: true },
  desc:            { type: String, default: '' },
  category:        { type: String, required: true },
  images:          [{ type: String }],
  retailPrice:     { type: Number, required: true },
  wholesalePrice:  { type: Number, default: null },
  wholesaleMinQty: { type: Number, default: null },
  variants:        [variantSchema],
  stock:           { type: Number, default: null },
  isPreOrder:      { type: Boolean, default: false },
  preOrderType:    { type: String, enum: ['deposit', 'full', null, ''], default: null },
  depositPercent:  { type: Number, default: null },
  discount:        { type: discountSchema, default: null },
  available:       { type: Boolean, default: true },
  isPartner:          { type: Boolean, default: false },
  partnerBrand:       { type: String, default: '' },
  partnerContact:     { type: String, default: '' },
  partnerPlanMonths:  { type: Number, default: null },
  partnerSubEnd:      { type: Date, default: null },
  featured:        { type: Boolean, default: false },
  fastSelling:     { type: Boolean, default: false },
}, { timestamps: true });

productSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  }
  if (this.preOrderType === '') this.preOrderType = null;
});

export default mongoose.model('Product', productSchema);
