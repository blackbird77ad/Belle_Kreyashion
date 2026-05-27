import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true, default: null },
  paystackCustomerCode: { type: String, default: '' },
}, { timestamps: true });

customerSchema.pre('save', async function () {
  if (!this.isNew) return;
  const count = await mongoose.model('Customer').countDocuments();
  this.customerId = `CUST-${String(count + 1).padStart(4, '0')}`;
});

export default mongoose.model('Customer', customerSchema);
