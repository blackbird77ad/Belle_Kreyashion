import crypto from 'node:crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import CertificateRecord from '../Models/CertificateRecord.mjs';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Product from '../Models/Product.mjs';
import {
  buildModuleBlockAssetId,
  buildLegacyDigitalModulesFromCollections,
  flattenTextBlocksToContent,
  isPreviewableDigitalFile,
  normalizeDigitalContentsPage,
  normalizeDigitalModules,
  sortDigitalLessonBlocks,
} from '../Utils/digitalModules.mjs';

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

const isPreviewable = (file) => isPreviewableDigitalFile(file);
const canDownloadAsset = (file) => !!file?.allowDownload || !isPreviewable(file);
const isExpired = (grant) => !!grant?.expiresAt && new Date(grant.expiresAt) <= new Date();

const resolveGrantModules = (grant = {}) => {
  const normalizedModules = normalizeDigitalModules(grant.modules || []);
  if (normalizedModules.length) return normalizedModules;
  return buildLegacyDigitalModulesFromCollections({
    digitalManualPages: grant.manualPages || [],
    digitalFiles: grant.files || [],
  });
};

const buildModuleLabel = (module = {}, index = 0) => module.title || `Module ${module.moduleNumber ?? index + 1}`;
const getModuleId = (module = {}, index = 0) => String(module.moduleId || module._id || `module-${index + 1}`);
const getItemId = (item = {}, moduleId = '', index = 0) => String(item.itemId || item._id || `${moduleId}-item-${index + 1}`);
const getBlockId = (block = {}, itemId = '', index = 0) => String(block.blockId || block._id || `${itemId}-block-${index + 1}`);

const flattenModuleFiles = (modules = []) => modules.flatMap((module, moduleIndex) => {
  const moduleId = getModuleId(module, moduleIndex);
  return (module.items || []).flatMap((item, itemIndex) => {
    const itemId = getItemId(item, moduleId, itemIndex);
    if (item.kind === 'file' && item.secureUrl) {
      return [{
        moduleId,
        assetId: itemId,
        parentItemId: itemId,
        label: item.title || item.originalFilename || 'Digital File',
        stepNumber: item.order ?? null,
        stepTitle: item.title || module.title || '',
        stepSummary: item.description || module.description || '',
        originalFilename: item.originalFilename || '',
        downloadName: item.downloadName || item.originalFilename || 'download',
        allowDownload: canDownloadAsset(item),
        fileKind: item.fileKind || 'other',
        mimeType: item.mimeType || '',
        bytes: item.bytes || 0,
        canPreview: isPreviewable(item),
        secureUrl: item.secureUrl || '',
        publicId: item.publicId || '',
        resourceType: item.resourceType || 'raw',
      }];
    }

    return sortDigitalLessonBlocks(item.blocks || [])
      .filter((block) => block.kind === 'file' && block.secureUrl)
      .map((block, blockIndex) => {
        const blockId = getBlockId(block, itemId, blockIndex);
        return {
          moduleId,
          assetId: buildModuleBlockAssetId(itemId, blockId),
          parentItemId: itemId,
          label: block.title || block.originalFilename || 'Digital Attachment',
          stepNumber: item.order ?? null,
          stepTitle: item.title || module.title || '',
          stepSummary: block.description || item.description || module.description || '',
          originalFilename: block.originalFilename || '',
          downloadName: block.downloadName || block.originalFilename || 'download',
          allowDownload: canDownloadAsset(block),
          fileKind: block.fileKind || 'other',
          mimeType: block.mimeType || '',
          bytes: block.bytes || 0,
          canPreview: isPreviewable(block),
          secureUrl: block.secureUrl || '',
          publicId: block.publicId || '',
          resourceType: block.resourceType || 'raw',
        };
      });
  });
});

const findModuleById = (grant, moduleId = '') => resolveGrantModules(grant)
  .find((module, index) => getModuleId(module, index) === String(moduleId));

const findAssetInGrant = (grant, assetId = '') => {
  const targetAssetId = String(assetId || '');
  for (const [moduleIndex, module] of resolveGrantModules(grant).entries()) {
    const moduleId = getModuleId(module, moduleIndex);
    for (const [itemIndex, item] of (module.items || []).entries()) {
      const itemId = getItemId(item, moduleId, itemIndex);
      if (item.kind === 'file' && itemId === targetAssetId) {
        return {
          moduleId,
          module,
          lessonItem: {
            ...item,
            itemId,
          },
          item: {
            ...item,
            itemId,
            assetId: itemId,
          },
        };
      }

      const sortedBlocks = sortDigitalLessonBlocks(item.blocks || []);
      const blockMatch = sortedBlocks.find((block, blockIndex) => (
        block.kind === 'file' && buildModuleBlockAssetId(itemId, getBlockId(block, itemId, blockIndex)) === targetAssetId
      ));
      if (blockMatch) {
        const blockIndex = sortedBlocks.findIndex((block, currentBlockIndex) => (
          block.kind === 'file' && buildModuleBlockAssetId(itemId, getBlockId(block, itemId, currentBlockIndex)) === targetAssetId
        ));
        const resolvedBlockId = getBlockId(blockMatch, itemId, blockIndex);
        return {
          moduleId,
          module,
          lessonItem: {
            ...item,
            itemId,
          },
          item: {
            ...blockMatch,
            itemId: resolvedBlockId,
            assetId: buildModuleBlockAssetId(itemId, resolvedBlockId),
            kind: 'file',
            title: blockMatch.title || blockMatch.originalFilename || item.title || 'Attachment',
          },
        };
      }
    }
  }

  const legacyFile = (grant.files || []).find((file) => file.assetId === targetAssetId);
  return legacyFile ? {
    moduleId: '',
    module: null,
    lessonItem: null,
    item: { ...legacyFile, itemId: legacyFile.assetId, assetId: legacyFile.assetId, kind: 'file' },
  } : null;
};

const computeProgress = (grant) => {
  const progress = grant?.moduleProgress || [];
  const totalModules = resolveGrantModules(grant).length || progress.length || grant?.files?.length || 0;
  const completedModules = progress.filter((item) => !!item.completedAt).length;
  const openedModules = progress.filter((item) => !!item.openedAt).length;
  const percent = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
  return { totalModules, completedModules, openedModules, percent };
};

const syncGrantProgress = (grant) => {
  if (!grant) return;
  const modules = resolveGrantModules(grant);
  const existingProgress = Array.isArray(grant.moduleProgress) ? grant.moduleProgress : [];
  grant.moduleProgress = modules.map((module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleItems = module.items || [];
    const legacyMatch = existingProgress.find((entry) => {
      if (String(entry.moduleId || '') === moduleId) return true;
      return !!entry.assetId && moduleItems.some((item, itemIndex) => getItemId(item, moduleId, itemIndex) === String(entry.assetId));
    }) || null;
    const moduleLogs = (grant.accessLogs || [])
      .filter((entry) => moduleItems.some((item, itemIndex) => getItemId(item, moduleId, itemIndex) === entry.assetId))
      .sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
    const lastLog = moduleLogs[moduleLogs.length - 1] || null;
    const lastLoggedItem = lastLog
      ? moduleItems.find((item, itemIndex) => getItemId(item, moduleId, itemIndex) === lastLog.assetId)
      : null;

    return {
      moduleId,
      assetId: legacyMatch?.assetId || moduleItems.find((item) => item.kind === 'file')?.itemId || '',
      label: legacyMatch?.label || buildModuleLabel(module, index),
      stepNumber: legacyMatch?.stepNumber ?? module.moduleNumber ?? null,
      moduleNumber: legacyMatch?.moduleNumber ?? module.moduleNumber ?? null,
      openedAt: legacyMatch?.openedAt || moduleLogs[0]?.openedAt || null,
      completedAt: legacyMatch?.completedAt || null,
      lastItemId: legacyMatch?.lastItemId || lastLog?.assetId || '',
      lastItemType: legacyMatch?.lastItemType || (lastLoggedItem?.kind === 'file' ? 'file' : ''),
      lastItemTitle: legacyMatch?.lastItemTitle || lastLoggedItem?.title || lastLoggedItem?.label || '',
      lastPositionUpdatedAt: legacyMatch?.lastPositionUpdatedAt || lastLog?.openedAt || null,
      textMarker: legacyMatch?.textMarker || null,
    };
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

const markModuleItemOpened = (grant, moduleId = '', item = {}) => {
  syncGrantProgress(grant);
  const progressItem = (grant.moduleProgress || []).find((entry) => String(entry.moduleId || '') === String(moduleId));
  if (!progressItem) return null;
  const now = new Date();
  if (!progressItem.openedAt) progressItem.openedAt = now;
  progressItem.lastItemId = String(item.itemId || item.assetId || progressItem.lastItemId || '');
  progressItem.lastItemType = item.kind === 'file' ? 'file' : 'text';
  progressItem.lastItemTitle = item.title || item.label || item.originalFilename || progressItem.lastItemTitle || '';
  progressItem.lastPositionUpdatedAt = now;
  if (item.kind === 'file') {
    progressItem.assetId = String(item.itemId || item.assetId || progressItem.assetId || '');
  }
  return progressItem;
};

const applyTextMarker = (progressItem, item = {}, { sentenceIndex, sentenceText } = {}) => {
  if (!progressItem) return;
  const parsedSentenceIndex = Number(sentenceIndex);
  const normalizedSentenceText = normalizeText(sentenceText || '').slice(0, 280);
  progressItem.textMarker = {
    itemId: String(item.itemId || ''),
    sentenceIndex: Number.isFinite(parsedSentenceIndex) && parsedSentenceIndex >= 0 ? parsedSentenceIndex : null,
    sentenceText: normalizedSentenceText,
    updatedAt: new Date(),
  };
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
  const digitalContentsPage = normalizeDigitalContentsPage(productMeta?.digitalContentsPage || grant.digitalContentsPage || {});
  const modules = resolveGrantModules(grant);
  const flatFiles = flattenModuleFiles(modules);
  const filesByPublicId = new Map(flatFiles.filter((file) => file?.publicId).map((file) => [String(file.publicId), file]));
  const progressByModuleId = new Map((grant.moduleProgress || []).map((entry) => [String(entry.moduleId || ''), entry]));
  const manualPages = [...(grant.manualPages || [])].sort((a, b) => {
    const aPage = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const bPage = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;
    return String(a.title || '').localeCompare(String(b.title || ''));
  }).map((page) => {
    const attachedMedia = filesByPublicId.get(String(page.mediaPublicId || '')) || null;
    return {
      pageId: page.pageId || '',
      pageNumber: page.pageNumber ?? null,
      title: page.title || '',
      summary: page.summary || '',
      content: page.content || '',
      attachedMedia: attachedMedia ? {
        assetId: attachedMedia.assetId,
        label: attachedMedia.label || attachedMedia.originalFilename || 'Attached media',
        fileKind: attachedMedia.fileKind || 'other',
        allowDownload: canDownloadAsset(attachedMedia),
      } : null,
    };
  });

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
    digitalContentsPage,
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
    modules: modules.map((module, moduleIndex) => {
      const moduleId = getModuleId(module, moduleIndex);
      const moduleProgress = progressByModuleId.get(moduleId) || null;
      return {
        moduleId,
        moduleNumber: module.moduleNumber ?? moduleIndex + 1,
        title: module.title || '',
        description: module.description || '',
        openedAt: moduleProgress?.openedAt || null,
        completedAt: moduleProgress?.completedAt || null,
        lastItemId: moduleProgress?.lastItemId || '',
        lastItemType: moduleProgress?.lastItemType || '',
        lastItemTitle: moduleProgress?.lastItemTitle || '',
        lastPositionUpdatedAt: moduleProgress?.lastPositionUpdatedAt || null,
        textMarker: moduleProgress?.textMarker || null,
        items: [...(module.items || [])]
          .sort((a, b) => {
            const diff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
            if (diff !== 0) return diff;
            return String(a.title || a.originalFilename || '').localeCompare(String(b.title || b.originalFilename || ''));
          })
          .map((item, itemIndex) => {
            const itemId = getItemId(item, moduleId, itemIndex);
            if (item.kind === 'file') {
              return {
                itemId,
                assetId: itemId,
                order: item.order ?? itemIndex + 1,
                kind: 'file',
                title: item.title || item.originalFilename || '',
                description: item.description || '',
                label: item.title || item.originalFilename || 'Digital File',
                originalFilename: item.originalFilename || '',
                downloadName: item.downloadName || item.originalFilename || 'download',
                allowDownload: canDownloadAsset(item),
                fileKind: item.fileKind || 'other',
                mimeType: item.mimeType || '',
                bytes: item.bytes || 0,
                canPreview: isPreviewable(item),
                isResumeTarget: moduleProgress?.lastItemId === itemId,
              };
            }

            return {
              itemId,
              order: item.order ?? itemIndex + 1,
              kind: 'text',
              title: item.title || '',
              description: item.description || '',
              content: item.content || flattenTextBlocksToContent(item.blocks || []) || '',
              hasContent: !!String(item.content || flattenTextBlocksToContent(item.blocks || []) || '').trim(),
              blocks: sortDigitalLessonBlocks(item.blocks || []).map((block, blockIndex) => {
                const blockId = getBlockId(block, itemId, blockIndex);
                if (block.kind === 'file') {
                  const assetId = buildModuleBlockAssetId(itemId, blockId);
                  return {
                    blockId,
                    order: block.order ?? blockIndex + 1,
                    kind: 'file',
                    title: block.title || block.originalFilename || '',
                    description: block.description || '',
                    label: block.title || block.originalFilename || 'Digital Attachment',
                    assetId,
                    allowDownload: canDownloadAsset(block),
                    fileKind: block.fileKind || 'other',
                    mimeType: block.mimeType || '',
                    bytes: block.bytes || 0,
                    canPreview: isPreviewable(block),
                  };
                }
                if (block.kind === 'link') {
                  return {
                    blockId,
                    order: block.order ?? blockIndex + 1,
                    kind: 'link',
                    title: block.title || '',
                    description: block.description || '',
                    url: block.url || '',
                    openInNewTab: block.openInNewTab !== false,
                  };
                }
                return {
                  blockId,
                  order: block.order ?? blockIndex + 1,
                  kind: 'text',
                  title: block.title || '',
                  presentation: block.presentation || undefined,
                  content: block.content || '',
                  contentHtml: block.contentHtml || '',
                };
              }),
              isResumeTarget: moduleProgress?.lastItemId === itemId,
              savedSentenceIndex: moduleProgress?.textMarker?.itemId === itemId
                ? moduleProgress.textMarker.sentenceIndex ?? null
                : null,
              savedSentenceText: moduleProgress?.textMarker?.itemId === itemId
                ? moduleProgress.textMarker.sentenceText || ''
                : '',
            };
          }),
      };
    }),
    manualPages,
    files: flatFiles.map((file) => ({
      moduleId: file.moduleId || '',
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
      isCompleted: !!(grant.moduleProgress || []).find((module) => module.assetId === file.assetId || module.lastItemId === file.assetId)?.completedAt,
      openedAt: (grant.moduleProgress || []).find((module) => module.assetId === file.assetId || module.lastItemId === file.assetId)?.openedAt || null,
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
      ? await Product.find({ _id: { $in: productIds } }).select('supportEmail supportWhatsApp digitalContentsPage')
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

    const assetMatch = findAssetInGrant(grant, assetId);
    if (!assetMatch?.item) return res.status(404).json({ message: 'File not found' });
    if (mode === 'download' && !canDownloadAsset(assetMatch.item)) {
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

    const assetMatch = findAssetInGrant(grant, payload.assetId);
    const asset = assetMatch?.item || null;
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
    if (assetMatch?.moduleId) {
      markModuleItemOpened(grant, assetMatch.moduleId, assetMatch.lessonItem || asset);
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

export const updateDigitalModuleProgress = async (req, res) => {
  try {
    const { grantId, moduleId, itemId } = req.params;
    const grant = await DigitalAccess.findOne({
      _id: grantId,
      customerId: req.customerAuth.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    syncGrantProgress(grant);
    const module = findModuleById(grant, moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const lessonItem = (module.items || []).find((item, index) => getItemId(item, moduleId, index) === String(itemId));
    if (!lessonItem) return res.status(404).json({ message: 'Lesson item not found' });

    const progressItem = markModuleItemOpened(grant, moduleId, {
      ...lessonItem,
      itemId: String(itemId),
      assetId: lessonItem.kind === 'file' ? String(itemId) : '',
    });

    if (lessonItem.kind === 'text' && (req.body?.sentenceIndex !== undefined || req.body?.sentenceText !== undefined)) {
      applyTextMarker(progressItem, { itemId: String(itemId) }, req.body || {});
    }

    syncGrantProgress(grant);
    await grant.save();

    res.json({
      progress: computeProgress(grant),
      certificateStatus: grant.certificateStatus,
      moduleProgress: progressItem,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markDigitalModuleComplete = async (req, res) => {
  try {
    const { grantId, assetId, moduleId: rawModuleId } = req.params;
    const grant = await DigitalAccess.findOne({
      _id: grantId,
      customerId: req.customerAuth.customerId,
    });

    const activeState = await ensureActiveGrant(grant);
    if (!activeState.ok) {
      return res.status(activeState.status).json({ message: activeState.message });
    }

    syncGrantProgress(grant);
    const derivedModuleId = rawModuleId || findAssetInGrant(grant, assetId)?.moduleId || '';
    const progressItem = (grant.moduleProgress || []).find((module) => (
      String(module.moduleId || '') === String(derivedModuleId)
      || (!!assetId && String(module.assetId || '') === String(assetId))
    ));
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
      moduleId: progressItem.moduleId || derivedModuleId || '',
      moduleProgress: progressItem,
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
