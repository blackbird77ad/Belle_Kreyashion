import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name:  { type: String },
  price: { type: Number },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  slug:             { type: String, unique: true },
  desc:             { type: String, default: '' },
  category:         { type: String, required: true },
  images:           [{ type: String }],
  retailPrice:      { type: Number, required: true },
  wholesalePrice:   { type: Number, default: null },
  wholesaleMinQty:  { type: Number, default: null },
  variants:         [variantSchema],
  isPreOrder:       { type: Boolean, default: false },
  preOrderType:     { type: String, enum: ['deposit', 'full', null], default: null },
  depositPercent:   { type: Number, default: null },
  available:        { type: Boolean, default: true },
  featured:         { type: Boolean, default: false },
}, { timestamps: true });

productSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
});

export default mongoose.model('Product', productSchema);
