import crypto from 'node:crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import CertificateRecord from '../Models/CertificateRecord.mjs';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Product from '../Models/Product.mjs';

const ACCESS_SECRET = process.env.DIGITAL_ACCESS_SECRET || process.env.JWT_SECRET;

const hashText = (value = '') => crypto.createHash('sha256').update(value).digest('hex');
const hashUserAgent = (value = '') => hashText(value);
const normalizeText = (value = '') => String(value || '').trim();
const normalizeEmail = (value = '') => normalizeText(value).toLowerCase();
const normalizePhone = (value = '') => {
  const cleaned = normalizeText(value).replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};
const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
const hashDevice = (req) => hashText([
  req.headers['user-agent'] || '',
  req.headers['accept-language'] || '',
  req.headers['sec-ch-ua-platform'] || '',
  req.headers['sec-ch-ua-mobile'] || '',
].join('|'));

const PREVIEWABLE_FILE_KINDS = ['document', 'video', 'audio', 'image'];
const isPreviewable = (file) => PREVIEWABLE_FILE_KINDS.includes(file.fileKind);
const canDownloadAsset = (file) => !!file?.allowDownload || !isPreviewable(file);
const isExpired = (grant) => !!grant?.expiresAt && new Date(grant.expiresAt) <= new Date();

const computeProgress = (grant) => {
  const progress = grant?.moduleProgress || [];
  const totalModules = progress.length || grant?.files?.length || 0;
  const completedModules = progress.filter((item) => !!item.completedAt).length;
  const openedModules = progress.filter((item) => !!item.openedAt).length;
  const percent = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
  return { totalModules, completedModules, openedModules, percent };
};

const syncGrantProgress = (grant) => {
  if (!grant) return;
  if (!Array.isArray(grant.moduleProgress) || !grant.moduleProgress.length) {
    grant.moduleProgress = (grant.files || []).map((file) => ({
      assetId: file.assetId,
      label: file.label || file.originalFilename || 'Digital File',
      stepNumber: file.stepNumber ?? null,
      openedAt: null,
      completedAt: null,
    }));
  }

  grant.moduleProgress.forEach((module) => {
    if (!module.openedAt) {
      const log = (grant.accessLogs || []).find((entry) => entry.assetId === module.assetId);
      if (log?.openedAt) module.openedAt = log.openedAt;
    }
  });

  const progress = computeProgress(grant);
  if (grant.isCertified) {
    if (grant.certificateStatus === 'requested' || grant.certificateStatus === 'generated' || grant.certificateStatus === 'declined') return;
    grant.certificateStatus = progress.totalModules > 0 && progress.completedModules >= progress.totalModules
      ? 'eligible'
      : 'in-progress';
  } else {
    grant.certificateStatus = 'not-applicable';
  }
};

const getDeviceLabel = (req, count) => {
  const platform = String(req.headers['sec-ch-ua-platform'] || '').replace(/"/g, '').trim();
  const mobile = String(req.headers['sec-ch-ua-mobile'] || '').replace(/"/g, '').trim();
  const parts = [platform || 'Browser'];
  if (mobile === '?1') parts.push('Mobile');
  return `${parts.join(' ')} ${count}`;
};

const ensureActiveGrant = async (grant) => {
  if (!grant) return { ok: false, message: 'Digital access not found', status: 404 };
  if (grant.status === 'revoked') return { ok: false, message: 'Digital access has been revoked', status: 403 };
  if (isExpired(grant)) {
    if (grant.status !== 'expired') {
      grant.status = 'expired';
      await grant.save();
    }
    return { ok: false, message: 'This digital access has expired', status: 403 };
  }
  if (grant.status !== 'active') {
    return { ok: false, message: 'Digital access is not active', status: 403 };
  }
  return { ok: true };
};

const authorizeDevice = async (grant, req) => {
  const deviceHash = hashDevice(req);
  const device = (grant.approvedDevices || []).find((entry) => entry.deviceHash === deviceHash);

  if (device) {
    device.lastSeenAt = new Date();
    await grant.save();
    return { ok: true, deviceHash };
  }

  const maxDevices = Number(grant.maxDevices) > 0 ? Number(grant.maxDevices) : 2;
  if ((grant.approvedDevices || []).length >= maxDevices) {
    return {
      ok: false,
      status: 403,
      message: `This purchase is already active on ${maxDevices} devices. Use one of those approved devices to continue.`,
    };
  }

  grant.approvedDevices.push({
    deviceHash,
    label: getDeviceLabel(req, (grant.approvedDevices || []).length + 1),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });
  await grant.save();

  return { ok: true, deviceHash };
};

const toLibraryEntry = (grant, certificate = null, productMeta = null) => {
  const certificateIssued = certificate?.emailStatus === 'sent';
  const supportEmail = normalizeEmail(productMeta?.supportEmail || grant.supportEmail || '');
  const supportWhatsApp = normalizePhone(productMeta?.supportWhatsApp || grant.supportWhatsApp || '');

  return {
    progress: computeProgress(grant),
    _id: grant._id,
    orderId: grant.orderId,
    productId: grant.productId,
    customerName: grant.customerName || '',
    customerEmail: grant.customerEmail || '',
    customerPhone: grant.customerPhone || '',
    productName: grant.productName,
    productImage: grant.productImage,
    productDesc: grant.productDesc,
    supportEmail,
    supportWhatsApp,
    digitalType: grant.digitalType,
    digitalAccessKind: grant.digitalAccessKind || 'paid',
    trialStatus: grant.trialStatus || 'none',
    trialEndsAt: grant.trialEndsAt,
    billingAmount: grant.billingAmount || 0,
    isSeries: !!grant.isSeries,
    seriesTitle: grant.seriesTitle || '',
    seriesDescription: grant.seriesDescription || '',
    isCertified: !!grant.isCertified,
    certificateTitle: grant.certificateTitle || '',
    certificateDescription: grant.certificateDescription || '',
    certificateStatus: grant.certificateStatus || 'not-applicable',
    certificateRequestedAt: grant.certificateRequestedAt,
    certificateGeneratedAt: grant.certificateGeneratedAt,
    certificateIssued,
    certificateEmailStatus: certificate?.emailStatus || 'unsent',
    certificateEmailSentAt: certificate?.emailSentAt || null,
    quantity: grant.quantity,
    accessType: grant.accessType,
    accessMonths: grant.accessMonths,
    expiresAt: grant.expiresAt,
    purchasedAt: grant.createdAt,
    certificate: certificate ? {
      _id: certificate._id,
      certificateNumber: certificate.certificateNumber || '',
      certificateTitle: certificate.certificateTitle || grant.certificateTitle || grant.productName,
      certificateSubtitle: certificate.certificateSubtitle || '',
      certificateBody: certificate.certificateBody || '',
      primaryColor: certificate.primaryColor || '#111827',
      accentColor: certificate.accentColor || '#FDC700',
      backgroundColor: certificate.backgroundColor || '#FFFDF7',
      fontColor: certificate.fontColor || '#374151',
      fontFamily: certificate.fontFamily || 'classic_serif',
      frameStyle: certificate.frameStyle || 'classic',
      issueDate: certificate.issueDate,
      learnerName: certificate.learnerName,
      productName: certificate.productName || grant.productName,
      organizerName: certificate.organizerName || '',
      sponsors: certificate.sponsors || [],
      signatories: certificate.signatories || [],
      emailStatus: certificate.emailStatus || 'unsent',
      emailSentAt: certificate.emailSentAt || null,
      issued: certificateIssued,
    } : null,
    files: [...(grant.files || [])].sort((a, b) => {
    const aStep = a.stepNumber ?? Number.MAX_SAFE_INTEGER;
    const bStep = b.stepNumber ?? Number.MAX_SAFE_INTEGER;
    if (aStep !== bStep) return aStep - bStep;
    return String(a.label || '').localeCompare(String(b.label || ''));
    }).map((file) => ({
      assetId: file.assetId,
      label: file.label,
      stepNumber: file.stepNumber ?? null,
      stepTitle: file.stepTitle || '',
      stepSummary: file.stepSummary || '',
      originalFilename: file.originalFilename,
      downloadName: file.downloadName,
      allowDownload: canDownloadAsset(file),
      fileKind: file.fileKind,
      mimeType: file.mimeType,
      bytes: file.bytes,
      canPreview: isPreviewable(file),
      isCompleted: !!(grant.moduleProgress || []).find((module) => module.assetId === file.assetId)?.completedAt,
      openedAt: (grant.moduleProgress || []).find((module) => module.assetId === file.assetId)?.openedAt || null,
    })),
  };
};

export const getCustomerDigitalLibrary = async (req, res) => {
  try {
    const grants = await DigitalAccess.find({
      customerId: req.customerAuth.customerId,
      status: { $in: ['active', 'expired'] },
    }).sort({ createdAt: -1 });

    const visibleGrants = [];
    for (const grant of grants) {
      const state = await ensureActiveGrant(grant);
      if (state.ok) {
        syncGrantProgress(grant);
        visibleGrants.push(grant);
      }
    }
    await Promise.all(visibleGrants.map((grant) => grant.save()));
    const certificates = await CertificateRecord.find({
      digitalAccess: { $in: visibleGrants.map((grant) => grant._id) },
      status: 'generated',
    });
    const certificatesByGrant = new Map(certificates.map((record) => [String(record.digitalAccess), record]));
    const productIds = [...new Set(visibleGrants.map((grant) => String(grant.productId || '')).filter(Boolean))];
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).select('supportEmail supportWhatsApp')
      : [];
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    res.json(visibleGrants.map((grant) => toLibraryEntry(
      grant,
      certificatesByGrant.get(String(grant._id)) || null,
      productsById.get(String(grant.productId || '')) || null
    )));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createDigitalAssetAccessUrl = async (req, res) => {
  try {
    const { grantId, assetId } = req.params;
    const { mode = 'inline' } = req.body || {};
    const grant = await DigitalAccess.findOne({
      _id: grantId,
      customerId: req.customerAuth.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    const deviceState = await authorizeDevice(grant, req);
    if (!deviceState.ok) {
      return res.status(deviceState.status).json({ message: deviceState.message });
    }

    const asset = (grant.files || []).find((file) => file.assetId === assetId);
    if (!asset) return res.status(404).json({ message: 'File not found' });
    if (mode === 'download' && !canDownloadAsset(asset)) {
      return res.status(403).json({ message: 'This file is view-only in your digital library' });
    }

    const token = jwt.sign({
      grantId: String(grant._id),
      assetId,
      mode: mode === 'download' ? 'download' : 'inline',
      customerId: req.customerAuth.customerId,
      deviceHash: deviceState.deviceHash,
      uaHash: hashUserAgent(req.headers['user-agent'] || ''),
    }, ACCESS_SECRET, { expiresIn: '10m' });

    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({
      url: `${origin}/api/products/digital/library/${grantId}/assets/${assetId}/serve?token=${encodeURIComponent(token)}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const serveDigitalAsset = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).json({ message: 'Access token missing' });

    const payload = jwt.verify(token, ACCESS_SECRET);
    if (
      payload.grantId !== req.params.grantId ||
      payload.assetId !== req.params.assetId ||
      payload.deviceHash !== hashDevice(req) ||
      payload.uaHash !== hashUserAgent(req.headers['user-agent'] || '')
    ) {
      return res.status(403).json({ message: 'This secure link is not valid on this device' });
    }

    const grant = await DigitalAccess.findOne({
      _id: payload.grantId,
      customerId: payload.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    const asset = (grant.files || []).find((file) => file.assetId === payload.assetId);
    if (!asset) return res.status(404).json({ message: 'File not found' });

    const remote = await axios.get(asset.secureUrl, { responseType: 'stream' });
    const filename = encodeURIComponent(asset.downloadName || asset.originalFilename || 'digital-file');

    res.setHeader('Content-Type', asset.mimeType || remote.headers['content-type'] || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${payload.mode === 'download' ? 'attachment' : 'inline'}; filename*=UTF-8''${filename}`
    );
    if (remote.headers['content-length']) {
      res.setHeader('Content-Length', remote.headers['content-length']);
    }
    res.setHeader('Cache-Control', 'private, no-store');

    grant.totalDownloads += 1;
    grant.lastAccessedAt = new Date();
    grant.accessLogs.push({
      assetId: asset.assetId,
      mode: payload.mode,
      deviceHash: payload.deviceHash,
      userAgentHash: payload.uaHash,
      openedAt: new Date(),
    });
    const progressItem = (grant.moduleProgress || []).find((module) => module.assetId === asset.assetId);
    if (progressItem && !progressItem.openedAt) {
      progressItem.openedAt = new Date();
    }
    syncGrantProgress(grant);
    await grant.save();

    remote.data.on('error', () => {
      if (!res.headersSent) res.status(502).end('File stream failed');
      else res.end();
    });

    remote.data.pipe(res);
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Secure link expired. Open the file again from your library.' });
    }
    res.status(500).json({ message: err.message });
  }
};

export const markDigitalModuleComplete = async (req, res) => {
  try {
    const { grantId, assetId } = req.params;
    const grant = await DigitalAccess.findOne({
      _id: grantId,
      customerId: req.customerAuth.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    syncGrantProgress(grant);
    const progressItem = (grant.moduleProgress || []).find((module) => module.assetId === assetId);
    if (!progressItem) return res.status(404).json({ message: 'Module not found' });
    if (!progressItem.openedAt) {
      return res.status(400).json({ message: 'Open this module first before marking it complete' });
    }

    progressItem.completedAt = progressItem.completedAt || new Date();
    syncGrantProgress(grant);
    await grant.save();

    res.json({
      progress: computeProgress(grant),
      certificateStatus: grant.certificateStatus,
      completedAssetId: assetId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const requestDigitalCertificate = async (req, res) => {
  try {
    const { grantId } = req.params;
    const grant = await DigitalAccess.findOne({
      _id: grantId,
      customerId: req.customerAuth.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    syncGrantProgress(grant);
    const progress = computeProgress(grant);
    if (!grant.isCertified) {
      return res.status(400).json({ message: 'This digital product does not issue certificates' });
    }
    if (progress.totalModules === 0 || progress.completedModules < progress.totalModules) {
      return res.status(400).json({ message: 'Complete every module before requesting your certificate' });
    }

    const learnerName = normalizeText(req.body?.learnerName || grant.customerName || '');
    const learnerEmail = normalizeEmail(req.body?.learnerEmail || grant.customerEmail || '');
    const learnerPhone = normalizePhone(req.body?.learnerPhone || grant.customerPhone || '');
    const requestNotes = normalizeText(req.body?.notes || '');

    if (!learnerName) {
      return res.status(400).json({ message: 'Enter the full name exactly as it should appear on the certificate' });
    }
    if (!learnerEmail || !isValidEmail(learnerEmail)) {
      return res.status(400).json({ message: 'Enter the email address where the certificate PDF should be sent' });
    }
    if (!learnerPhone) {
      return res.status(400).json({ message: 'Enter the learner phone or WhatsApp number for certificate follow-up' });
    }

    let record = await CertificateRecord.findOne({ digitalAccess: grant._id });
    if (grant.certificateStatus === 'generated' && record?.status === 'generated') {
      return res.json({
        message: 'Certificate has already been generated for this digital product',
        requestId: record._id,
        certificateStatus: grant.certificateStatus,
      });
    }
    if (grant.certificateStatus === 'requested' && record?.status === 'pending') {
      return res.json({
        message: 'Certificate request already sent for admin review',
        requestId: record._id,
        certificateStatus: grant.certificateStatus,
      });
    }

    if (!record) {
      record = await CertificateRecord.create({
        type: 'digital_request',
        status: 'pending',
        generationMode: 'manual',
        generationChoiceMade: false,
        templateId: undefined,
        templateName: '',
        digitalAccess: grant._id,
        productId: grant.productId,
        productName: grant.productName,
        customerId: grant.customerId,
        learnerName,
        learnerEmail,
        learnerPhone,
        requestNotes,
        completionSnapshot: progress,
        certificateTitle: grant.certificateTitle || grant.productName,
        certificateSubtitle: grant.seriesTitle || grant.productName,
        certificateBody: grant.certificateDescription || `Awarded to ${learnerName} for successfully completing ${grant.productName}.`,
      });
    } else {
      record.status = 'pending';
      record.generationMode = record.generationMode || 'manual';
      if (record.generationChoiceMade === undefined) {
        record.generationChoiceMade = !!record.templateId || record.status !== 'pending';
      }
      if (!record.templateId) record.templateName = '';
      record.requestedAt = new Date();
      record.learnerName = learnerName;
      record.learnerEmail = learnerEmail;
      record.learnerPhone = learnerPhone;
      record.requestNotes = requestNotes;
      record.completionSnapshot = progress;
      record.certificateTitle = record.certificateTitle || grant.certificateTitle || grant.productName;
      record.certificateSubtitle = record.certificateSubtitle || grant.seriesTitle || grant.productName;
      record.certificateBody = record.certificateBody || grant.certificateDescription || `Awarded to ${learnerName} for successfully completing ${grant.productName}.`;
      await record.save();
    }

    grant.certificateStatus = 'requested';
    grant.certificateRequestedAt = new Date();
    grant.certificateRequestId = record._id;
    await grant.save();

    res.status(201).json({
      message: 'Certificate request sent for admin review',
      requestId: record._id,
      certificateStatus: grant.certificateStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
