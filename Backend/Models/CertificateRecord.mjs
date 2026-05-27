import mongoose from 'mongoose';

const signatorySchema = new mongoose.Schema({
  name: { type: String, default: '' },
  role: { type: String, default: '' },
}, { _id: false });

const completionSnapshotSchema = new mongoose.Schema({
  totalModules: { type: Number, default: 0 },
  completedModules: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
}, { _id: false });

const certificateRecordSchema = new mongoose.Schema({
  type: { type: String, enum: ['digital_request', 'manual'], default: 'manual' },
  status: { type: String, enum: ['pending', 'generated', 'declined'], default: 'pending' },
  digitalAccess: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalAccess', default: undefined },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: undefined },
  productName: { type: String, default: '' },
  customerId: { type: String, default: '' },
  learnerName: { type: String, required: true, trim: true },
  learnerEmail: { type: String, default: '', trim: true, lowercase: true },
  learnerPhone: { type: String, default: '', trim: true },
  requestedAt: { type: Date, default: Date.now },
  requestNotes: { type: String, default: '' },
  completionSnapshot: { type: completionSnapshotSchema, default: () => ({}) },
  generationMode: { type: String, enum: ['manual', 'template'], default: 'manual' },
  generationChoiceMade: { type: Boolean, default: false },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', default: undefined },
  templateName: { type: String, default: '' },
  certificateNumber: { type: String, unique: true, sparse: true },
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
  emailStatus: { type: String, enum: ['unsent', 'sent', 'failed'], default: 'unsent' },
  emailSentAt: { type: Date, default: null },
  emailError: { type: String, default: '' },
  generatedBy: { type: String, default: '' },
  generatedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

certificateRecordSchema.index(
  { digitalAccess: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { digitalAccess: { $exists: true, $type: 'objectId' } },
  }
);

certificateRecordSchema.pre('validate', function (next) {
  // Manual or bulk certificates should not write null into the unique digitalAccess index.
  if (!this.digitalAccess) this.digitalAccess = undefined;
  if (!this.productId) this.productId = undefined;
  if (!this.templateId) this.templateId = undefined;
  next();
});

certificateRecordSchema.pre('save', async function () {
  if (!this.certificateNumber && this.status === 'generated') {
    const year = new Date().getFullYear();
    const count = await mongoose.model('CertificateRecord').countDocuments();
    this.certificateNumber = `CERT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

export default mongoose.model('CertificateRecord', certificateRecordSchema);
