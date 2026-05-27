import mongoose from 'mongoose';

const signatorySchema = new mongoose.Schema({
  name: { type: String, default: '' },
  role: { type: String, default: '' },
}, { _id: false });

const certificateTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  productName: { type: String, default: '' },
  certificateTitle: { type: String, default: '' },
  certificateSubtitle: { type: String, default: '' },
  certificateBody: { type: String, default: '' },
  primaryColor: { type: String, default: '#111827' },
  accentColor: { type: String, default: '#FDC700' },
  backgroundColor: { type: String, default: '#FFFDF7' },
  fontColor: { type: String, default: '#374151' },
  fontFamily: {
    type: String,
    enum: ['classic_serif', 'formal_serif', 'modern_sans', 'executive_sans'],
    default: 'classic_serif',
  },
  frameStyle: {
    type: String,
    enum: ['classic', 'double', 'soft', 'minimal'],
    default: 'classic',
  },
  issueDate: { type: Date, default: null },
  organizerName: { type: String, default: '' },
  sponsors: [{ type: String }],
  signatories: { type: [signatorySchema], default: [] },
  notes: { type: String, default: '' },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('CertificateTemplate', certificateTemplateSchema);
