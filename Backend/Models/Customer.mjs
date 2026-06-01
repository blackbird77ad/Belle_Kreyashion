import mongoose from 'mongoose';

const buildCustomerCode = (customer) => {
  const year = new Date().getFullYear();
  const suffix = String(customer._id || '').slice(-6).toUpperCase();
  return `CUST-${year}-${suffix || '000000'}`;
};

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true, default: null },
  paystackCustomerCode: { type: String, default: '' },
  preferredCurrency: { type: String, default: 'GHS', trim: true, uppercase: true },
  preferredLanguage: { type: String, default: 'en', trim: true, lowercase: true },
  passwordHash: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, default: '' },
  emailVerificationExpiresAt: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: '' },
  passwordResetExpiresAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

customerSchema.pre('validate', function (next) {
  if (!this.customerId) {
    this.customerId = buildCustomerCode(this);
  }
  next();
});

export default mongoose.model('Customer', customerSchema);
