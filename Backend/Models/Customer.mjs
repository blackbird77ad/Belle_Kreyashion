import mongoose from 'mongoose';

const buildCustomerCode = (customer) => {
  const year = new Date().getFullYear();
  const suffix = String(customer._id || '').slice(-6).toUpperCase();
  return `CUST-${year}-${suffix || '000000'}`;
};

const customerSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  deviceHash: { type: String, required: true },
  userAgentHash: { type: String, default: '' },
  label: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { _id: false });

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
  customerSessions: { type: [customerSessionSchema], default: [] },
}, { timestamps: true });

customerSchema.pre('validate', function (next) {
  if (!this.customerId) {
    this.customerId = buildCustomerCode(this);
  }
  next();
});

export default mongoose.model('Customer', customerSchema);
