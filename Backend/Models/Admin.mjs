import mongoose from 'mongoose';
const adminSchema = new mongoose.Schema({
  pinHash: { type: String, required: true },
}, { timestamps: true });
export default mongoose.model('Admin', adminSchema);
