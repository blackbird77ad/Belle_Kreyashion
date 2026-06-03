import axios from 'axios';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Order from '../Models/Order.mjs';
import Product from '../Models/Product.mjs';
import {
  buildModuleBlockAssetId,
  buildLegacyDigitalModulesFromCollections,
  flattenTextBlocksToContent,
  isPreviewableDigitalFile,
  normalizeDigitalContentsPage,
  normalizeDigitalWritingBlockPresentation,
  normalizeDigitalModules,
  sortDigitalLessonBlocks,
} from '../Utils/digitalModules.mjs';

const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
const DEFAULT_DEVICE_LIMIT = 2;
const DEFAULT_TRIAL_DAYS = 7;
const TRIAL_WORKER_INTERVAL_MS = Number(process.env.DIGITAL_TRIAL_WORKER_INTERVAL_MS) || (60 * 60 * 1000);
let workerStarted = false;
let workerRunning = false;

const resolveProductModules = (product = {}) => {
  const normalizedModules = normalizeDigitalModules(product.digitalModules || []);
  if (normalizedModules.length) return normalizedModules;
  return buildLegacyDigitalModulesFromCollections({
    digitalManualPages: product.digitalManualPages || [],
    digitalFiles: product.digitalFiles || [],
  });
};

const snapshotModules = (product) => resolveProductModules(product).map((module, moduleIndex) => {
  const moduleId = String(module._id || module.moduleId || `module-${moduleIndex + 1}`);
  return {
    moduleId,
    moduleNumber: module.moduleNumber ?? moduleIndex + 1,
    title: module.title || '',
    description: module.description || '',
    items: [...(module.items || [])]
      .sort((a, b) => {
        const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
        if (orderDiff !== 0) return orderDiff;
        return String(a.title || a.originalFilename || '').localeCompare(String(b.title || b.originalFilename || ''));
      })
      .map((item, itemIndex) => ({
        itemId: String(item._id || item.itemId || `${moduleId}-item-${itemIndex + 1}`),
        order: item.order ?? itemIndex + 1,
        kind: item.kind || 'text',
        title: item.title || item.originalFilename || '',
        description: item.description || '',
        content: item.kind === 'text' ? String(item.content || flattenTextBlocksToContent(item.blocks || []) || '') : '',
        blocks: item.kind === 'text'
          ? sortDigitalLessonBlocks(item.blocks || []).map((block, blockIndex) => ({
              blockId: String(block._id || block.blockId || `${moduleId}-item-${itemIndex + 1}-block-${blockIndex + 1}`),
              order: block.order ?? blockIndex + 1,
              kind: block.kind || 'text',
              title: block.title || block.originalFilename || '',
              description: block.description || '',
              presentation: block.kind === 'text'
                ? normalizeDigitalWritingBlockPresentation(block.presentation || {})
                : undefined,
              content: block.kind === 'text' ? String(block.content || '') : '',
              contentHtml: block.kind === 'text' ? String(block.contentHtml || '') : '',
              url: block.kind === 'link' ? String(block.url || '') : '',
              openInNewTab: block.kind === 'link' ? block.openInNewTab !== false : true,
              allowDownload: block.kind === 'file' ? (!!block.allowDownload || !isPreviewableDigitalFile(block)) : false,
              secureUrl: block.kind === 'file' ? block.secureUrl || '' : '',
              publicId: block.kind === 'file' ? block.publicId || '' : '',
              originalFilename: block.kind === 'file' ? block.originalFilename || '' : '',
              downloadName: block.kind === 'file' ? (block.downloadName || block.originalFilename || 'download') : '',
              mimeType: block.kind === 'file' ? block.mimeType || '' : '',
              resourceType: block.kind === 'file' ? (block.resourceType || 'raw') : 'raw',
              fileKind: block.kind === 'file' ? (block.fileKind || 'other') : 'other',
              bytes: block.kind === 'file' ? (block.bytes || 0) : 0,
              watermarkEnabled: block.kind === 'file' ? !!block.watermarkEnabled : false,
              watermarkText: block.kind === 'file' ? (block.watermarkText || '') : '',
            }))
          : [],
        allowDownload: item.kind === 'file' ? (!!item.allowDownload || !isPreviewableDigitalFile(item)) : false,
        secureUrl: item.kind === 'file' ? item.secureUrl || '' : '',
        publicId: item.kind === 'file' ? item.publicId || '' : '',
        originalFilename: item.kind === 'file' ? item.originalFilename || '' : '',
        downloadName: item.kind === 'file' ? (item.downloadName || item.originalFilename || 'download') : '',
        mimeType: item.kind === 'file' ? item.mimeType || '' : '',
        resourceType: item.kind === 'file' ? (item.resourceType || 'raw') : 'raw',
        fileKind: item.kind === 'file' ? (item.fileKind || 'other') : 'other',
        bytes: item.kind === 'file' ? (item.bytes || 0) : 0,
        watermarkEnabled: item.kind === 'file' ? !!item.watermarkEnabled : false,
        watermarkText: item.kind === 'file' ? (item.watermarkText || '') : '',
      })),
  };
});

const snapshotFiles = (product) => snapshotModules(product)
  .flatMap((module) => (
    (module.items || []).flatMap((item) => {
      if (item.kind === 'file' && item.secureUrl) {
        return [{
          assetId: item.itemId,
          publicId: item.publicId || '',
          label: item.title || item.originalFilename || 'Digital File',
          stepNumber: item.order ?? null,
          stepTitle: item.title || module.title || '',
          stepSummary: item.description || module.description || '',
          allowDownload: !!item.allowDownload || !isPreviewableDigitalFile(item),
          secureUrl: item.secureUrl,
          originalFilename: item.originalFilename || '',
          downloadName: item.downloadName || item.originalFilename || 'download',
          mimeType: item.mimeType || '',
          resourceType: item.resourceType || 'raw',
          fileKind: item.fileKind || 'other',
          bytes: item.bytes || 0,
          watermarkEnabled: !!item.watermarkEnabled,
          watermarkText: item.watermarkText || '',
        }];
      }

      return (item.blocks || [])
        .filter((block) => block.kind === 'file' && block.secureUrl)
        .map((block) => ({
          assetId: buildModuleBlockAssetId(item.itemId, block.blockId),
          publicId: block.publicId || '',
          label: block.title || block.originalFilename || 'Digital Attachment',
          stepNumber: item.order ?? null,
          stepTitle: item.title || module.title || '',
          stepSummary: block.description || item.description || module.description || '',
          allowDownload: !!block.allowDownload || !isPreviewableDigitalFile(block),
          secureUrl: block.secureUrl,
          originalFilename: block.originalFilename || '',
          downloadName: block.downloadName || block.originalFilename || 'download',
          mimeType: block.mimeType || '',
          resourceType: block.resourceType || 'raw',
          fileKind: block.fileKind || 'other',
          bytes: block.bytes || 0,
          watermarkEnabled: !!block.watermarkEnabled,
          watermarkText: block.watermarkText || '',
        }));
    })
  ))
  .sort((a, b) => {
    const aStep = a.stepNumber ?? Number.MAX_SAFE_INTEGER;
    const bStep = b.stepNumber ?? Number.MAX_SAFE_INTEGER;
    if (aStep !== bStep) return aStep - bStep;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });

const snapshotManualPages = (product) => snapshotModules(product)
  .flatMap((module) => (
    (module.items || [])
      .filter((item) => item.kind === 'text' && String(item.title || item.description || item.content || '').trim())
      .map((item) => ({
        pageId: item.itemId,
        pageNumber: item.order ?? null,
        title: item.title || `Lesson ${item.order || 1}`,
        summary: item.description || module.description || '',
        content: item.content || flattenTextBlocksToContent(item.blocks || []) || '',
        mediaPublicId: '',
      }))
  ))
  .sort((a, b) => {
    const aPage = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const bPage = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

const buildModuleProgress = (product) => snapshotModules(product).map((module) => ({
  moduleId: module.moduleId,
  assetId: (module.items || []).find((item) => item.kind === 'file')?.itemId || '',
  label: module.title || `Module ${module.moduleNumber || 1}`,
  stepNumber: module.moduleNumber ?? null,
  moduleNumber: module.moduleNumber ?? null,
  openedAt: null,
  completedAt: null,
  lastItemId: '',
  lastItemType: '',
  lastItemTitle: '',
  lastPositionUpdatedAt: null,
  textMarker: null,
}));

const buildModuleProgressSnapshot = (modules = [], existingProgress = []) => modules.map((module) => {
  const moduleId = String(module.moduleId || '');
  const moduleItems = Array.isArray(module.items) ? module.items : [];
  const moduleItemIds = new Set(moduleItems.map((item) => String(item.itemId || '')).filter(Boolean));
  const fileItemIds = moduleItems
    .filter((item) => item.kind === 'file')
    .map((item) => String(item.itemId || ''))
    .filter(Boolean);
  const firstFileItemId = fileItemIds[0] || '';
  const previousEntry = (Array.isArray(existingProgress) ? existingProgress : []).find((entry) => (
    String(entry?.moduleId || '') === moduleId
      || (!!entry?.assetId && fileItemIds.includes(String(entry.assetId || '')))
  )) || null;
  const previousLastItemId = String(previousEntry?.lastItemId || '');
  const nextLastItemId = moduleItemIds.has(previousLastItemId) ? previousLastItemId : '';
  const lastItem = nextLastItemId
    ? moduleItems.find((item) => String(item.itemId || '') === nextLastItemId) || null
    : null;
  const previousTextMarkerItemId = String(previousEntry?.textMarker?.itemId || '');
  const textMarkerItem = previousTextMarkerItemId
    ? moduleItems.find((item) => String(item.itemId || '') === previousTextMarkerItemId) || null
    : null;
  const nextTextMarker = textMarkerItem?.kind === 'text'
    ? {
        itemId: previousTextMarkerItemId,
        sentenceIndex: Number.isFinite(Number(previousEntry?.textMarker?.sentenceIndex))
          && Number(previousEntry.textMarker.sentenceIndex) >= 0
          ? Number(previousEntry.textMarker.sentenceIndex)
          : null,
        sentenceText: String(previousEntry?.textMarker?.sentenceText || ''),
        updatedAt: previousEntry?.textMarker?.updatedAt || null,
      }
    : null;

  return {
    moduleId,
    assetId: firstFileItemId || '',
    label: module.title || `Module ${module.moduleNumber || 1}`,
    stepNumber: module.moduleNumber ?? null,
    moduleNumber: module.moduleNumber ?? null,
    openedAt: previousEntry?.openedAt || null,
    completedAt: previousEntry?.completedAt || null,
    lastItemId: nextLastItemId,
    lastItemType: lastItem ? (lastItem.kind === 'file' ? 'file' : 'text') : '',
    lastItemTitle: lastItem
      ? String(lastItem.title || lastItem.originalFilename || previousEntry?.lastItemTitle || '')
      : '',
    lastPositionUpdatedAt: nextLastItemId ? (previousEntry?.lastPositionUpdatedAt || null) : null,
    textMarker: nextTextMarker,
  };
});

const resolveCertificateStatus = (product, moduleProgress = [], currentStatus = '') => {
  if (!product?.isCertified) {
    return currentStatus === 'generated' ? 'generated' : 'not-applicable';
  }

  if (currentStatus === 'requested' || currentStatus === 'generated' || currentStatus === 'declined') {
    return currentStatus;
  }

  const totalModules = moduleProgress.length;
  const completedModules = moduleProgress.filter((entry) => !!entry?.completedAt).length;
  return totalModules > 0 && completedModules >= totalModules ? 'eligible' : 'in-progress';
};

export const syncDigitalAccessGrantsForProduct = async (product) => {
  if (!product?._id || !product?.isDigital) return 0;

  const grants = await DigitalAccess.find({
    productId: product._id,
    status: { $ne: 'revoked' },
  });
  if (!grants.length) return 0;

  for (const grant of grants) {
    const modules = snapshotModules(product);
    const nextModuleProgress = buildModuleProgressSnapshot(modules, grant.moduleProgress || []);

    grant.productName = product.name || '';
    grant.productImage = product.images?.[0] || '';
    grant.productDesc = product.desc || '';
    grant.supportEmail = product.supportEmail || '';
    grant.supportWhatsApp = product.supportWhatsApp || '';
    grant.digitalContentsPage = normalizeDigitalContentsPage(product.digitalContentsPage || {});
    grant.digitalType = product.digitalType || 'other';
    grant.modules = modules;
    grant.files = snapshotFiles(product);
    grant.manualPages = snapshotManualPages(product);
    grant.isSeries = !!product.isSeries;
    grant.seriesTitle = product.seriesTitle || '';
    grant.seriesDescription = product.seriesDescription || '';
    grant.isCertified = !!product.isCertified;
    grant.certificateTitle = product.certificateTitle || product.name || '';
    grant.certificateDescription = product.certificateDescription || '';
    grant.moduleProgress = nextModuleProgress;
    grant.certificateStatus = resolveCertificateStatus(product, nextModuleProgress, grant.certificateStatus || '');
    await grant.save();
  }

  return grants.length;
};

const resolveExpiry = ({ accessType, accessMonths, baseDate = new Date() }) => {
  if (accessType === 'lifetime') return null;
  if (!accessMonths || accessMonths <= 0) return null;
  const expiry = new Date(baseDate);
  expiry.setMonth(expiry.getMonth() + Number(accessMonths));
  return expiry;
};

const buildBillingAuthorization = (context = {}, fallbackEmail = '') => {
  const authorization = context.authorization;
  if (!authorization?.authorization_code) return null;

  return {
    authorizationCode: authorization.authorization_code || '',
    signature: authorization.signature || '',
    reusable: !!authorization.reusable,
    last4: authorization.last4 || '',
    bin: authorization.bin || '',
    bank: authorization.bank || '',
    brand: authorization.brand || '',
    cardType: authorization.card_type || '',
    expMonth: authorization.exp_month || '',
    expYear: authorization.exp_year || '',
    email: context.customer?.email || fallbackEmail || '',
    customerCode: context.customer?.customer_code || '',
    setupReference: context.paymentRef || '',
    setupChargedAmount: Number(context.paystackAmount) || 0,
  };
};

const appendOrderTrialEvent = async (orderId, event) => {
  if (!orderId) return;
  await Order.findByIdAndUpdate(orderId, {
    billingState: event.status === 'charged' ? 'paid' : event.status === 'failed' ? 'failed' : 'trialing',
    $push: { trialChargeHistory: event },
  }).catch(() => {});
};

export const grantDigitalAccessForOrder = async (order, context = {}) => {
  const digitalItems = (order.items || []).filter((item) => item.isDigital && item.productId);
  if (!digitalItems.length) return [];

  const productIds = [...new Set(digitalItems.map((item) => String(item.productId)))];
  const products = await Product.find({ _id: { $in: productIds }, isDigital: true });
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const grants = [];

  for (const item of digitalItems) {
    const product = productsById.get(String(item.productId));
    const productModules = product ? snapshotModules(product) : [];
    if (!product || !productModules.length) continue;

    const digitalAccessKind = item.digitalAccessKind || product.digitalAccessKind || 'paid';
    const configuredAccessType = item.accessType
      || (product.accessMode === 'limited' ? 'limited' : 'lifetime');
    const accessType = configuredAccessType === 'limited' ? 'limited' : 'lifetime';
    const accessMonths = accessType === 'limited'
      ? Number(item.accessMonths) || Number(product.limitedAccessMonths) || 6
      : null;
    const trialDays = digitalAccessKind === 'trial'
      ? Math.max(1, Number(item.trialDays) || Number(product.freeTrialDays) || DEFAULT_TRIAL_DAYS)
      : 0;

    const now = new Date();
    const trialEndsAt = digitalAccessKind === 'trial'
      ? new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000))
      : null;
    const expiresAt = resolveExpiry({
      accessType,
      accessMonths,
      baseDate: trialEndsAt || now,
    });

    const billingAmount = digitalAccessKind === 'trial'
      ? Number(item.trialChargeAmount ?? item.price ?? product.retailPrice) || 0
      : 0;
    const purchasePrice = digitalAccessKind === 'trial'
      ? Number(item.trialChargeAmount ?? item.price ?? product.retailPrice) || 0
      : Number(item.price ?? 0) || 0;
    const billingAuthorization = digitalAccessKind === 'trial'
      ? buildBillingAuthorization(context, order.customer?.email || '')
      : null;

    const eventMessage = digitalAccessKind === 'trial'
      ? `${trialDays}-day free trial started`
      : digitalAccessKind === 'free'
        ? 'Free digital access unlocked'
        : 'Digital purchase completed';

    const grant = await DigitalAccess.findOneAndUpdate(
      { order: order._id, productId: product._id },
      {
        order: order._id,
        orderId: order.orderId,
        paymentRef: order.paymentRef || '',
        productId: product._id,
        productName: product.name,
        productImage: product.images?.[0] || '',
        productDesc: product.desc || '',
        supportEmail: product.supportEmail || '',
        supportWhatsApp: product.supportWhatsApp || '',
        digitalContentsPage: normalizeDigitalContentsPage(product.digitalContentsPage || {}),
        digitalType: product.digitalType || 'other',
        digitalAccessKind,
        trialStatus: digitalAccessKind === 'trial' ? 'trialing' : 'none',
        trialEndsAt,
        trialConvertedAt: null,
        billingAmount,
        billingCurrency: 'GHS',
        purchasePrice,
        purchaseCurrency: 'GHS',
        billingAuthorization,
        accessType,
        accessMonths,
        expiresAt,
        customerId: order.customer?.customerId || '',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || '',
        customerName: order.customer?.name || '',
        quantity: item.qty || 1,
        status: expiresAt && expiresAt <= new Date() ? 'expired' : 'active',
        modules: productModules,
        files: snapshotFiles(product),
        manualPages: snapshotManualPages(product),
        maxDevices: DEFAULT_DEVICE_LIMIT,
        billingEvents: [{
          reference: context.paymentRef || order.paymentRef || '',
          amount: Number(context.paystackAmount) || 0,
          status: digitalAccessKind === 'trial' ? 'trial-started' : 'charged',
          message: eventMessage,
          createdAt: new Date(),
        }],
        isSeries: !!product.isSeries,
        seriesTitle: product.seriesTitle || '',
        seriesDescription: product.seriesDescription || '',
        isCertified: !!product.isCertified,
        certificateTitle: product.certificateTitle || product.name,
        certificateDescription: product.certificateDescription || '',
        certificateStatus: product.isCertified ? 'in-progress' : 'not-applicable',
        moduleProgress: buildModuleProgress(product),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    grants.push(grant);
  }

  return grants;
};

export const processDueTrialCharges = async () => {
  if (!PAYSTACK_KEY) return 0;

  const dueGrants = await DigitalAccess.find({
    status: 'active',
    trialStatus: 'trialing',
    trialEndsAt: { $lte: new Date() },
    billingAmount: { $gt: 0 },
    'billingAuthorization.reusable': true,
    'billingAuthorization.authorizationCode': { $ne: '' },
  }).sort({ trialEndsAt: 1 });

  let processed = 0;

  for (const grant of dueGrants) {
    const amountSubunit = Math.round((Number(grant.billingAmount) || 0) * 100);
    if (amountSubunit <= 0) {
      grant.trialStatus = 'converted';
      grant.trialConvertedAt = new Date();
      grant.lastChargeError = '';
      grant.billingEvents.push({
        reference: '',
        amount: 0,
        status: 'charged',
        message: 'Trial completed with no extra charge required',
        createdAt: new Date(),
      });
      await grant.save();
      await appendOrderTrialEvent(grant.order, {
        reference: '',
        amount: 0,
        status: 'charged',
        message: 'Trial completed with no extra charge required',
        createdAt: new Date(),
      });
      processed += 1;
      continue;
    }

    grant.lastChargeAttemptAt = new Date();
    grant.chargeAttempts = (grant.chargeAttempts || 0) + 1;

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          authorization_code: grant.billingAuthorization.authorizationCode,
          email: grant.billingAuthorization.email || grant.customerEmail,
          amount: String(amountSubunit),
          metadata: {
            purpose: 'digital_trial_conversion',
            grantId: String(grant._id),
            orderId: grant.orderId,
            productId: String(grant.productId),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paystackData = response.data?.data;
      if (response.data?.status && paystackData?.status === 'success') {
        grant.trialStatus = 'converted';
        grant.trialConvertedAt = new Date();
        grant.lastChargeReference = paystackData.reference || '';
        grant.lastChargeError = '';
        grant.billingEvents.push({
          reference: paystackData.reference || '',
          amount: grant.billingAmount,
          status: 'charged',
          message: 'Trial converted and charged automatically',
          createdAt: new Date(),
        });
        await grant.save();

        await appendOrderTrialEvent(grant.order, {
          reference: paystackData.reference || '',
          amount: grant.billingAmount,
          status: 'charged',
          message: 'Trial converted and charged automatically',
          createdAt: new Date(),
        });
      } else {
        const message = paystackData?.gateway_response || response.data?.message || 'Automatic billing failed';
        grant.trialStatus = 'payment-failed';
        grant.status = 'revoked';
        grant.lastChargeError = message;
        grant.billingEvents.push({
          reference: paystackData?.reference || '',
          amount: grant.billingAmount,
          status: 'failed',
          message,
          createdAt: new Date(),
        });
        await grant.save();

        await appendOrderTrialEvent(grant.order, {
          reference: paystackData?.reference || '',
          amount: grant.billingAmount,
          status: 'failed',
          message,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Automatic billing failed';
      grant.trialStatus = 'payment-failed';
      grant.status = 'revoked';
      grant.lastChargeError = message;
      grant.billingEvents.push({
        reference: '',
        amount: grant.billingAmount,
        status: 'failed',
        message,
        createdAt: new Date(),
      });
      await grant.save();

      await appendOrderTrialEvent(grant.order, {
        reference: '',
        amount: grant.billingAmount,
        status: 'failed',
        message,
        createdAt: new Date(),
      });
    }

    processed += 1;
  }

  return processed;
};

export const startDigitalTrialBillingWorker = () => {
  if (workerStarted || process.env.ENABLE_DIGITAL_TRIAL_BILLING === 'false') return;

  const run = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await processDueTrialCharges();
    } catch (err) {
      console.error('Digital trial billing worker error:', err.message);
    } finally {
      workerRunning = false;
    }
  };

  workerStarted = true;
  setTimeout(run, 15000);
  setInterval(run, TRIAL_WORKER_INTERVAL_MS);
};
