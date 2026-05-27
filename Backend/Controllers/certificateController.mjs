import jwt from 'jsonwebtoken';
import CertificateRecord from '../Models/CertificateRecord.mjs';
import CertificateTemplate from '../Models/CertificateTemplate.mjs';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import { sendCertificateEmail } from '../Services/certificateMailService.mjs';
import { buildCertificatePdf } from '../Utils/certificatePdf.mjs';

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeText = (value = '') => value.trim();
const normalizeColor = (value = '', fallback = '#111827') => {
  const normalized = String(value || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toUpperCase() : fallback;
};
const normalizeFontFamily = (value = '', fallback = 'classic_serif') => (
  ['classic_serif', 'formal_serif', 'modern_sans', 'executive_sans'].includes(value) ? value : fallback
);
const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeText(String(item || ''))).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => normalizeText(item)).filter(Boolean);
  return [];
};
const normalizeStatus = (value, fallback = 'pending') => ['pending', 'generated', 'declined'].includes(value) ? value : fallback;
const normalizeGenerationMode = (value, fallback = 'manual') => ['manual', 'template'].includes(value) ? value : fallback;
const parseDate = (value, fallback = null) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const buildCompletionSnapshot = (value = {}) => ({
  totalModules: Number(value.totalModules) || 0,
  completedModules: Number(value.completedModules) || 0,
  percent: Number(value.percent) || 0,
});

const buildSignatories = (value = []) => {
  const input = Array.isArray(value) ? value : [];
  return input
    .map((entry) => ({
      name: normalizeText(entry?.name || ''),
      role: normalizeText(entry?.role || ''),
    }))
    .filter((entry) => entry.name || entry.role);
};

const cleanTemplateBody = (body = {}, admin = {}) => ({
  name: normalizeText(body.name || ''),
  productName: normalizeText(body.productName || ''),
  certificateTitle: normalizeText(body.certificateTitle || body.productName || ''),
  certificateSubtitle: normalizeText(body.certificateSubtitle || ''),
  certificateBody: normalizeText(body.certificateBody || ''),
  primaryColor: normalizeColor(body.primaryColor, '#111827'),
  accentColor: normalizeColor(body.accentColor, '#FDC700'),
  backgroundColor: normalizeColor(body.backgroundColor, '#FFFDF7'),
  fontColor: normalizeColor(body.fontColor, '#374151'),
  fontFamily: normalizeFontFamily(body.fontFamily, 'classic_serif'),
  frameStyle: ['classic', 'double', 'soft', 'minimal'].includes(body.frameStyle) ? body.frameStyle : 'classic',
  issueDate: parseDate(body.issueDate, null),
  organizerName: normalizeText(body.organizerName || ''),
  sponsors: normalizeList(body.sponsors || []),
  signatories: buildSignatories(body.signatories || []),
  notes: normalizeText(body.notes || ''),
  createdBy: normalizeText(admin.username || admin.email || admin.id || admin.adminId || 'admin'),
});

const parseBulkLearners = (raw = '') => String(raw)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.includes('|')
      ? line.split('|')
      : line.split(',');
    const [name = '', email = '', phone = ''] = parts.map((part) => normalizeText(part));
    return {
      learnerName: name,
      learnerEmail: normalizeEmail(email),
      learnerPhone: phone,
    };
  })
  .filter((entry) => entry.learnerName);

const buildCertificateFilename = (record = {}) => {
  const base = String(record.certificateNumber || record.certificateTitle || record.productName || 'certificate')
    .trim()
    .replace(/[^A-Za-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'certificate';
};

const normalizeWhatsAppNumber = (value = '') => {
  const cleaned = String(value || '').replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.slice(1)}`;
  return cleaned;
};

const getCertificateShareSecret = () => process.env.CERTIFICATE_SHARE_SECRET || process.env.JWT_SECRET;
const getCertificateShareExpiry = () => process.env.CERTIFICATE_SHARE_EXPIRES_IN || '14d';
const getPublicApiOrigin = (req) => (
  process.env.PUBLIC_API_URL ||
  process.env.BACKEND_PUBLIC_URL ||
  process.env.API_PUBLIC_URL ||
  `${req.protocol}://${req.get('host')}`
);

const signCertificateShareToken = (record) => jwt.sign({
  certificateId: String(record._id),
  action: 'certificate-download',
}, getCertificateShareSecret(), { expiresIn: getCertificateShareExpiry() });

const buildWhatsAppMessage = (record, shareLink) => {
  const parts = [
    `Hello ${record.learnerName || 'Learner'},`,
    `Your certificate${record.certificateTitle ? ` for ${record.certificateTitle}` : ''} is ready.`,
  ];
  if (record.productName) parts.push(`Programme: ${record.productName}`);
  parts.push(`Download your certificate here: ${shareLink}`);
  parts.push('Belle Kreyashon');
  return parts.join('\n');
};

const computeGrantCertificateState = (grant) => {
  if (!grant?.isCertified) return 'not-applicable';
  const modules = grant.moduleProgress || [];
  if (!modules.length) return 'in-progress';
  const complete = modules.every((entry) => !!entry.completedAt);
  return complete ? 'eligible' : 'in-progress';
};

const syncGrantFromCertificate = async (record) => {
  if (!record?.digitalAccess) return;
  const grant = await DigitalAccess.findById(record.digitalAccess);
  if (!grant) return;

  if (record.status === 'generated') {
    grant.certificateStatus = 'generated';
    grant.certificateGeneratedAt = record.generatedAt || new Date();
    grant.certificateRequestId = record._id;
  } else if (record.status === 'declined') {
    grant.certificateStatus = 'declined';
    grant.certificateRequestId = record._id;
  } else {
    grant.certificateStatus = 'requested';
    grant.certificateRequestedAt = record.requestedAt || new Date();
    grant.certificateGeneratedAt = null;
    grant.certificateRequestId = record._id;
  }

  await grant.save();
};

const resetGrantCertificate = async (digitalAccessId) => {
  if (!digitalAccessId) return;
  const grant = await DigitalAccess.findById(digitalAccessId);
  if (!grant) return;

  grant.certificateStatus = computeGrantCertificateState(grant);
  grant.certificateRequestedAt = null;
  grant.certificateGeneratedAt = null;
  grant.certificateRequestId = null;
  await grant.save();
};

const cleanCertificateBody = (body = {}, admin = {}) => {
  const status = normalizeStatus(body.status, 'pending');
  const type = body.type === 'digital_request' ? 'digital_request' : 'manual';
  const generationMode = normalizeGenerationMode(body.generationMode, 'manual');
  const explicitGenerationChoice = body.generationChoiceMade;
  const issueDate = parseDate(body.issueDate, status === 'generated' ? new Date() : null);
  const requestedAt = parseDate(body.requestedAt, new Date());
  const signatories = buildSignatories(body.signatories || []);
  const digitalAccess = type === 'digital_request' && body.digitalAccess ? body.digitalAccess : undefined;
  const productId = body.productId || undefined;
  const templateId = generationMode === 'template' && body.templateId ? body.templateId : undefined;
  const generationChoiceMade = type === 'manual'
    ? true
    : explicitGenerationChoice === undefined
      ? (status !== 'pending' || generationMode === 'template')
      : !!explicitGenerationChoice;

  return {
    type,
    status,
    digitalAccess,
    productId,
    generationMode,
    generationChoiceMade,
    templateId,
    templateName: generationMode === 'template' ? normalizeText(body.templateName || '') : '',
    productName: normalizeText(body.productName || ''),
    customerId: normalizeText(body.customerId || ''),
    learnerName: normalizeText(body.learnerName || ''),
    learnerEmail: normalizeEmail(body.learnerEmail || ''),
    learnerPhone: normalizeText(body.learnerPhone || ''),
    requestedAt,
    requestNotes: normalizeText(body.requestNotes || ''),
    completionSnapshot: buildCompletionSnapshot(body.completionSnapshot || {}),
    certificateTitle: normalizeText(body.certificateTitle || body.productName || ''),
    certificateSubtitle: normalizeText(body.certificateSubtitle || ''),
    certificateBody: normalizeText(body.certificateBody || ''),
    primaryColor: normalizeColor(body.primaryColor, '#111827'),
    accentColor: normalizeColor(body.accentColor, '#FDC700'),
    backgroundColor: normalizeColor(body.backgroundColor, '#FFFDF7'),
    fontColor: normalizeColor(body.fontColor, '#374151'),
    fontFamily: normalizeFontFamily(body.fontFamily, 'classic_serif'),
    frameStyle: ['classic', 'double', 'soft', 'minimal'].includes(body.frameStyle) ? body.frameStyle : 'classic',
    issueDate,
    organizerName: normalizeText(body.organizerName || ''),
    sponsors: normalizeList(body.sponsors || []),
    signatories,
    emailStatus: ['unsent', 'sent', 'failed'].includes(body.emailStatus) ? body.emailStatus : 'unsent',
    emailSentAt: parseDate(body.emailSentAt, null),
    emailError: normalizeText(body.emailError || ''),
    generatedBy: status === 'generated'
      ? normalizeText(admin.username || admin.email || admin.id || admin.adminId || 'admin')
      : '',
    generatedAt: status === 'generated' ? parseDate(body.generatedAt, new Date()) : null,
    notes: normalizeText(body.notes || ''),
  };
};

const syncCertificateTemplateMeta = async (payload = {}) => {
  if (payload.generationMode !== 'template' || !payload.templateId) {
    return {
      ...payload,
      generationMode: 'manual',
      templateId: undefined,
      templateName: '',
    };
  }

  const template = await CertificateTemplate.findById(payload.templateId).select('_id name');
  if (!template) {
    const err = new Error('Selected certificate template was not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...payload,
    generationMode: 'template',
    templateId: template._id,
    templateName: template.name || payload.templateName || '',
  };
};

export const getCertificates = async (req, res) => {
  try {
    const { search, status, type } = req.query;
    const query = {};

    if (status && ['pending', 'generated', 'declined'].includes(status)) query.status = status;
    if (type && ['digital_request', 'manual'].includes(type)) query.type = type;
    if (search) {
      query.$or = [
        { learnerName: { $regex: search, $options: 'i' } },
        { learnerEmail: { $regex: search, $options: 'i' } },
        { learnerPhone: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { certificateTitle: { $regex: search, $options: 'i' } },
        { templateName: { $regex: search, $options: 'i' } },
        { certificateNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const records = await CertificateRecord.find(query).sort({ updatedAt: -1, createdAt: -1 });
    const priority = { pending: 0, generated: 1, declined: 2 };
    records.sort((a, b) => {
      const diff = (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      if (diff) return diff;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCertificateTemplates = async (req, res) => {
  try {
    const templates = await CertificateTemplate.find().sort({ updatedAt: -1, createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCertificateTemplate = async (req, res) => {
  try {
    const payload = cleanTemplateBody(req.body, req.admin || {});
    if (!payload.name) return res.status(400).json({ message: 'Template name is required' });
    const template = await CertificateTemplate.create(payload);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCertificateTemplate = async (req, res) => {
  try {
    const payload = cleanTemplateBody(req.body, req.admin || {});
    if (!payload.name) return res.status(400).json({ message: 'Template name is required' });
    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteCertificateTemplate = async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const bulkGenerateCertificates = async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.body.templateId);
    if (!template) return res.status(404).json({ message: 'Bulk template not found' });

    const learners = Array.isArray(req.body.learners)
      ? req.body.learners
      : parseBulkLearners(req.body.bulkText || '');

    if (!learners.length) {
      return res.status(400).json({ message: 'Paste at least one learner name for bulk generation' });
    }

    const issueDate = req.body.issueDate ? parseDate(req.body.issueDate, template.issueDate || new Date()) : (template.issueDate || new Date());
    const createdBy = normalizeText(req.admin?.username || req.admin?.email || req.admin?.id || req.admin?.adminId || 'admin');

    const payloads = learners.map((learner) => ({
      type: 'manual',
      status: 'generated',
      generationMode: 'template',
      generationChoiceMade: true,
      templateId: template._id,
      templateName: template.name || '',
      productName: req.body.productName ? normalizeText(req.body.productName) : template.productName || '',
      learnerName: learner.learnerName,
      learnerEmail: normalizeEmail(learner.learnerEmail || ''),
      learnerPhone: normalizeText(learner.learnerPhone || ''),
      requestedAt: new Date(),
      requestNotes: '',
      completionSnapshot: { totalModules: 0, completedModules: 0, percent: 0 },
      certificateTitle: template.certificateTitle || template.productName || 'Certificate',
      certificateSubtitle: template.certificateSubtitle || '',
      certificateBody: template.certificateBody || '',
      primaryColor: template.primaryColor || '#111827',
      accentColor: template.accentColor || '#FDC700',
      backgroundColor: template.backgroundColor || '#FFFDF7',
      fontColor: template.fontColor || '#374151',
      fontFamily: template.fontFamily || 'classic_serif',
      frameStyle: template.frameStyle || 'classic',
      issueDate,
      organizerName: template.organizerName || '',
      sponsors: template.sponsors || [],
      signatories: template.signatories || [],
      generatedBy: createdBy,
      generatedAt: new Date(),
      notes: template.notes || '',
      emailStatus: 'unsent',
      emailSentAt: null,
      emailError: '',
    }));

    const created = await CertificateRecord.create(payloads);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const createCertificate = async (req, res) => {
  try {
    const payload = await syncCertificateTemplateMeta(cleanCertificateBody(req.body, req.admin || {}));
    const record = await CertificateRecord.create(payload);
    await syncGrantFromCertificate(record);
    res.status(201).json(record);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

export const updateCertificate = async (req, res) => {
  try {
    const existing = await CertificateRecord.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Certificate request not found' });

    const previousDigitalAccess = existing.digitalAccess ? String(existing.digitalAccess) : '';
    const payload = await syncCertificateTemplateMeta(cleanCertificateBody(req.body, req.admin || {}));
    if (req.body.emailStatus === undefined) payload.emailStatus = existing.emailStatus || 'unsent';
    if (req.body.emailSentAt === undefined) payload.emailSentAt = existing.emailSentAt || null;
    if (req.body.emailError === undefined) payload.emailError = existing.emailError || '';
    if (payload.learnerEmail !== existing.learnerEmail && payload.emailStatus === 'sent') {
      payload.emailStatus = 'unsent';
      payload.emailSentAt = null;
      payload.emailError = '';
    }
    if (payload.status === 'generated') {
      payload.generatedAt = existing.generatedAt || payload.generatedAt || new Date();
      payload.generatedBy = payload.generatedBy || existing.generatedBy || '';
    }

    Object.assign(existing, payload);
    const next = await existing.save();

    if (previousDigitalAccess && previousDigitalAccess !== String(next.digitalAccess || '')) {
      await resetGrantCertificate(previousDigitalAccess);
    }
    await syncGrantFromCertificate(next);

    res.json(next);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

export const deleteCertificate = async (req, res) => {
  try {
    const record = await CertificateRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Certificate request not found' });
    await resetGrantCertificate(record.digitalAccess ? String(record.digitalAccess) : '');
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sendCertificateToLearner = async (req, res) => {
  try {
    const record = await CertificateRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Certificate request not found' });
    if (record.status !== 'generated') {
      return res.status(400).json({ message: 'Only generated certificates can be emailed' });
    }

    if (req.body?.learnerEmail) {
      record.learnerEmail = normalizeEmail(req.body.learnerEmail);
    }
    if (!record.learnerEmail) {
      return res.status(400).json({ message: 'Add the learner email before sending the certificate' });
    }

    const delivery = await sendCertificateEmail(record);
    record.emailStatus = 'sent';
    record.emailSentAt = new Date();
    record.emailError = '';
    await record.save();

    res.json({
      message: 'Certificate email sent successfully',
      delivery,
      certificate: record,
    });
  } catch (err) {
    if (req.params.id) {
      await CertificateRecord.findByIdAndUpdate(req.params.id, {
        emailStatus: 'failed',
        emailSentAt: null,
        emailError: err.message || 'Email send failed',
      }).catch(() => {});
    }
    res.status(500).json({ message: err.message });
  }
};

export const downloadCertificatePdf = async (req, res) => {
  try {
    const record = await CertificateRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Certificate request not found' });
    if (record.status !== 'generated') {
      return res.status(400).json({ message: 'Only generated certificates can be downloaded' });
    }

    const pdf = buildCertificatePdf(record);
    const filename = `${buildCertificateFilename(record)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCertificateWhatsAppShare = async (req, res) => {
  try {
    const record = await CertificateRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Certificate request not found' });
    if (record.status !== 'generated') {
      return res.status(400).json({ message: 'Only generated certificates can be shared on WhatsApp' });
    }

    if (req.body?.learnerPhone) {
      record.learnerPhone = normalizeText(req.body.learnerPhone);
      await record.save();
    }

    const phone = normalizeWhatsAppNumber(record.learnerPhone || '');
    if (!phone) {
      return res.status(400).json({ message: 'Add a learner WhatsApp number before sharing the certificate' });
    }

    const token = signCertificateShareToken(record);
    const shareLink = `${getPublicApiOrigin(req)}/api/certificates/${record._id}/share-download?token=${encodeURIComponent(token)}`;
    const message = buildWhatsAppMessage(record, shareLink);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.json({
      message: 'WhatsApp share link ready',
      url,
      shareLink,
      whatsappNumber: phone,
      certificate: record,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadSharedCertificatePdf = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).json({ message: 'Certificate share token missing' });

    const payload = jwt.verify(String(token), getCertificateShareSecret());
    if (payload.action !== 'certificate-download' || payload.certificateId !== req.params.id) {
      return res.status(403).json({ message: 'This certificate link is invalid' });
    }

    const record = await CertificateRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Certificate request not found' });
    if (record.status !== 'generated') {
      return res.status(400).json({ message: 'This certificate is not ready for download yet' });
    }

    const pdf = buildCertificatePdf(record);
    const filename = `${buildCertificateFilename(record)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(pdf);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'This certificate link has expired. Request a new one.' });
    }
    res.status(500).json({ message: err.message });
  }
};
