import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['percent', 'fixed', 'free_shipping'], required: true },
  value: { type: Number, default: 0 },
  minSubtotal: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null },
  usageLimit: { type: Number, default: null },
  perCustomerLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  applicableProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: String, trim: true }],
  customerSegment: { type: String, enum: ['all', 'new', 'returning'], default: 'all' },
  campaignName: { type: String, default: '' },
  referralCode: { type: String, default: '' },
  redemptions: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    customerKey: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    redeemedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

couponSchema.pre('validate', function () {
  this.code = String(this.code || '').trim().toUpperCase();
  this.value = Math.max(0, Number(this.value) || 0);
  this.minSubtotal = Math.max(0, Number(this.minSubtotal) || 0);
  this.maxDiscount = this.maxDiscount === null || this.maxDiscount === '' ? null : Math.max(0, Number(this.maxDiscount) || 0);
  this.usageLimit = this.usageLimit === null || this.usageLimit === '' ? null : Math.max(1, Number(this.usageLimit) || 1);
  this.perCustomerLimit = Math.max(1, Number(this.perCustomerLimit) || 1);
});

export default mongoose.model('Coupon', couponSchema);
