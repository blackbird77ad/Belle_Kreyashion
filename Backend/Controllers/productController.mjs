import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Product from '../Models/Product.mjs';
import {
  DIGITAL_DURATIONS,
  DIGITAL_FORMATS,
  DIGITAL_INCLUSIONS,
  DIGITAL_SKILL_LEVELS,
  DIGITAL_TOPICS,
} from '../Constants/digitalProductOptions.mjs';
import {
  buildLegacyDigitalModulesFromCollections,
  flattenTextBlocksToContent,
  isPreviewableDigitalFile,
  normalizeDigitalContentsPage,
  normalizeDigitalModules,
  sortDigitalLessonBlocks,
} from '../Utils/digitalModules.mjs';
import { syncDigitalAccessGrantsForProduct } from '../Services/digitalAccessService.mjs';
import { buildGoogleMerchantFeedXml, isMerchantFeedEligible } from '../Utils/googleMerchantFeed.mjs';

const LIFETIME_SURCHARGE_PERCENT = 20;
const CUSTOMER_JWT_SECRET = process.env.JWT_SECRET;
const DIGITAL_TYPE_DEFAULTS = ['document', 'video', 'audio', 'bundle', 'template', 'mixed', 'other'];

const convertDrive = (url) => {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
};

const processImages = (images) => {
  if (!images) return [];
  return images.map(convertDrive).filter(Boolean);
};

const parseVariants = (variants) => {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (typeof variants === 'string') {
    if (!variants.trim()) return [];
    try { return JSON.parse(variants); } catch { return []; }
  }
  return [];
};

const parseDigitalFiles = (digitalFiles) => {
  if (!digitalFiles) return [];
  if (Array.isArray(digitalFiles)) return digitalFiles.filter((file) => file?.secureUrl);
  if (typeof digitalFiles === 'string') {
    if (!digitalFiles.trim()) return [];
    try {
      const parsed = JSON.parse(digitalFiles);
      return Array.isArray(parsed) ? parsed.filter((file) => file?.secureUrl) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseDigitalManualPages = (digitalManualPages) => {
  if (!digitalManualPages) return [];
  if (Array.isArray(digitalManualPages)) return digitalManualPages;
  if (typeof digitalManualPages === 'string') {
    if (!digitalManualPages.trim()) return [];
    try {
      const parsed = JSON.parse(digitalManualPages);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseDigitalModules = (digitalModules) => {
  if (!digitalModules) return [];
  if (Array.isArray(digitalModules)) return digitalModules;
  if (typeof digitalModules === 'string') {
    if (!digitalModules.trim()) return [];
    try {
      const parsed = JSON.parse(digitalModules);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseStringList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeSingleOption = (value, allowed, fallback = null) => (
  allowed.includes(value) ? value : fallback
);

const normalizeFlexibleOption = (value, fallback = null) => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const normalizeFlexibleOptionList = (value) => (
  [...new Set(parseStringList(value).map((item) => String(item).trim()).filter(Boolean))]
);

const parseQueryList = (value) => normalizeFlexibleOptionList(value);

const mergeDistinctOptionValues = (defaults = [], values = []) => (
  [...new Set([
    ...defaults.map((item) => String(item || '').trim()),
    ...values.map((item) => String(item || '').trim()),
  ].filter(Boolean))]
);
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizePhone = (value = '') => {
  const cleaned = String(value || '').trim().replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};

const roundMoney = (value) => Math.round(Number(value) || 0);
const stepRank = (file = {}) => (file.stepNumber ?? Number.MAX_SAFE_INTEGER);
const manualPageRank = (page = {}) => (page.pageNumber ?? Number.MAX_SAFE_INTEGER);
const moduleRank = (module = {}) => (module.moduleNumber ?? Number.MAX_SAFE_INTEGER);

const resolveProductModules = (product = {}) => {
  const normalizedModules = normalizeDigitalModules(product.digitalModules || []);
  if (normalizedModules.length) return normalizedModules;
  return buildLegacyDigitalModulesFromCollections({
    digitalManualPages: product.digitalManualPages || [],
    digitalFiles: product.digitalFiles || [],
  });
};

const isDiscountLive = (product) => {
  const discount = product?.discount;
  if (!discount?.active) return false;
  const now = new Date();
  if (discount.startDate && new Date(discount.startDate) > now) return false;
  if (discount.endDate && new Date(discount.endDate) < now) return false;
  if (discount.limitCustomers && (discount.usedCount || 0) >= discount.limitCustomers) return false;
  return true;
};

const applyDiscountToAmount = (amount, discount) => {
  if (!discount?.active) return amount;
  if (discount.type === 'percent') return Math.max(0, roundMoney(amount * (1 - discount.value / 100)));
  return Math.max(0, roundMoney(amount - discount.value));
};

const buildPublicIdentifierQuery = (value = '') => {
  const identifier = String(value || '').trim();
  if (!identifier) return null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return {
      available: true,
      $or: [{ _id: identifier }, { slug: identifier }],
    };
  }

  return {
    available: true,
    slug: identifier,
  };
};

const readOptionalCustomerId = (req) => {
  const token = req.headers['x-customer-token'];
  if (!token || !CUSTOMER_JWT_SECRET) return null;

  try {
    return jwt.verify(token, CUSTOMER_JWT_SECRET)?.customerId || null;
  } catch {
    return null;
  }
};

const decorateProductsWithAccess = async (req, docs = []) => {
  const customerId = readOptionalCustomerId(req);
  const publicProducts = docs.map((doc) => toPublicProduct(doc));
  const originalProducts = docs.map((doc) => (doc?.toObject ? doc.toObject() : { ...doc }));

  if (!customerId) {
    return publicProducts.map((product) => ({
      ...product,
      customerHasAccess: false,
    }));
  }

  const digitalProductIds = publicProducts
    .filter((product) => product.isDigital)
    .map((product) => String(product._id));

  if (!digitalProductIds.length) {
    return publicProducts.map((product) => ({
      ...product,
      customerHasAccess: false,
    }));
  }

  const grants = await DigitalAccess.find({
    customerId,
    productId: { $in: digitalProductIds },
    status: 'active',
  }).select('productId');

  const ownedIds = new Set(grants.map((grant) => String(grant.productId)));
  return publicProducts.map((product, index) => {
    const customerHasAccess = product.isDigital ? ownedIds.has(String(product._id)) : false;
    const originalProduct = originalProducts[index] || {};

    return {
      ...product,
      customerHasAccess,
      ...(customerHasAccess
        ? {
          supportEmail: normalizeEmail(originalProduct.supportEmail || ''),
          supportWhatsApp: normalizePhone(originalProduct.supportWhatsApp || ''),
        }
        : {}),
    };
  });
};

const buildDigitalPricing = (product) => {
  if (product.digitalAccessKind === 'free') {
    return {
      limitedBasePrice: 0,
      lifetimeBasePrice: 0,
      limitedPrice: 0,
      lifetimePrice: 0,
    };
  }

  const limitedBasePrice = roundMoney(product.retailPrice);
  const lifetimeBasePrice = roundMoney(limitedBasePrice * (1 + (LIFETIME_SURCHARGE_PERCENT / 100)));
  const discountActive = isDiscountLive(product);
  const limitedPrice = discountActive ? applyDiscountToAmount(limitedBasePrice, product.discount) : limitedBasePrice;
  const lifetimePrice = discountActive ? applyDiscountToAmount(lifetimeBasePrice, product.discount) : lifetimeBasePrice;
  return {
    limitedBasePrice,
    lifetimeBasePrice,
    limitedPrice,
    lifetimePrice,
  };
};

const toPublicProduct = (doc) => {
  const product = doc?.toObject ? doc.toObject() : { ...doc };

  delete product.partnerContact;
  delete product.partnerPlanMonths;
  delete product.partnerSubEnd;

  if (product.isDigital) {
    const accessMode = product.accessMode || 'customer_choice';
    const limitedAccessMonths = Number(product.limitedAccessMonths) || 6;
    const pricing = buildDigitalPricing(product);
    const modules = resolveProductModules(product);
    const fileItems = modules.flatMap((module) => (
      (module.items || []).flatMap((item) => {
        if (item.kind === 'file') {
          return [{
            ...item,
            moduleNumber: module.moduleNumber ?? null,
            moduleTitle: module.title || '',
          }];
        }

        return sortDigitalLessonBlocks(item.blocks || [])
          .filter((block) => block.kind === 'file')
          .map((block) => ({
            ...block,
            moduleNumber: module.moduleNumber ?? null,
            moduleTitle: module.title || '',
          }));
      })
    ));
    const textItems = modules.flatMap((module) => (
      (module.items || []).filter((item) => item.kind === 'text').map((item) => ({
        ...item,
        content: item.content || flattenTextBlocksToContent(item.blocks || []) || '',
        moduleNumber: module.moduleNumber ?? null,
        moduleTitle: module.title || '',
      }))
    ));
    const modulesOutline = modules
      .map((module, moduleIndex) => ({
        moduleId: String(module._id || module.moduleId || `module-${moduleIndex + 1}`),
        moduleNumber: module.moduleNumber ?? moduleIndex + 1,
        title: module.title || '',
        description: module.description || '',
        itemCount: (module.items || []).length,
        textItemCount: (module.items || []).filter((item) => item.kind === 'text').length,
        fileItemCount: (module.items || []).filter((item) => item.kind === 'file').length,
        items: [...(module.items || [])]
          .sort((a, b) => {
            const diff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
            if (diff !== 0) return diff;
            return String(a.title || a.originalFilename || '').localeCompare(String(b.title || b.originalFilename || ''));
          })
          .map((item, itemIndex) => ({
            itemId: String(item._id || item.itemId || `item-${itemIndex + 1}`),
            order: item.order ?? itemIndex + 1,
            kind: item.kind || 'text',
            title: item.title || item.originalFilename || '',
            description: item.description || '',
            hasContent: item.kind === 'text' ? !!String(item.content || flattenTextBlocksToContent(item.blocks || []) || '').trim() : false,
            blockCount: item.kind === 'text' ? sortDigitalLessonBlocks(item.blocks || []).length : 0,
            inlineAttachmentCount: item.kind === 'text'
              ? sortDigitalLessonBlocks(item.blocks || []).filter((block) => block.kind === 'file').length
              : 0,
            linkCount: item.kind === 'text'
              ? sortDigitalLessonBlocks(item.blocks || []).filter((block) => block.kind === 'link').length
              : 0,
            fileKind: item.kind === 'file' ? (item.fileKind || 'other') : '',
            allowDownload: item.kind === 'file'
              ? (!!item.allowDownload || !isPreviewableDigitalFile(item))
              : false,
          })),
      }))
      .sort((a, b) => {
        const diff = moduleRank(a) - moduleRank(b);
        if (diff !== 0) return diff;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });

    product.accessMode = accessMode;
    product.limitedAccessMonths = limitedAccessMonths;
    product.digitalAccessKind = product.digitalAccessKind || 'paid';
    product.digitalSkillLevel = product.digitalSkillLevel || null;
    product.digitalFormat = product.digitalFormat || null;
    product.digitalDuration = product.digitalDuration || null;
    product.digitalTopics = Array.isArray(product.digitalTopics) ? product.digitalTopics : [];
    product.digitalInclusions = Array.isArray(product.digitalInclusions) ? product.digitalInclusions : [];
    product.freeTrialDays = product.digitalAccessKind === 'trial'
      ? Math.max(1, Number(product.freeTrialDays) || 7)
      : 0;
    product.isSeries = !!product.isSeries;
    product.seriesTitle = product.seriesTitle || '';
    product.seriesDescription = product.seriesDescription || '';
    product.isCertified = !!product.isCertified;
    product.certificateTitle = product.certificateTitle || product.name || '';
    product.certificateDescription = product.certificateDescription || '';
    product.supportEmail = normalizeEmail(product.supportEmail || '');
    product.supportWhatsApp = normalizePhone(product.supportWhatsApp || '');
    product.digitalModuleCount = modulesOutline.length;
    product.digitalModuleItemCount = modulesOutline.reduce((sum, module) => sum + (module.itemCount || 0), 0);
    product.digitalFileCount = fileItems.length;
    product.downloadableDigitalFileCount = fileItems.filter((file) => !!file.allowDownload || !isPreviewableDigitalFile(file)).length;
    product.hasPreviewableDigitalFiles = fileItems.some((file) => ['document', 'video', 'audio', 'image'].includes(file.fileKind));
    product.digitalModulesOutline = modulesOutline;
    product.digitalManualPageCount = textItems.length;
    product.hasDigitalManualPages = textItems.length > 0;
    product.hasDigitalModules = modulesOutline.length > 0;
    product.digitalPricing = {
      limitedPrice: pricing.limitedPrice,
      limitedBasePrice: pricing.limitedBasePrice,
      lifetimePrice: accessMode === 'limited' ? null : pricing.lifetimePrice,
      lifetimeBasePrice: accessMode === 'limited' ? null : pricing.lifetimeBasePrice,
      lifetimeMarkupPercent: LIFETIME_SURCHARGE_PERCENT,
    };
  }

  delete product.supportEmail;
  delete product.supportWhatsApp;
  delete product.digitalContentsPage;
  delete product.digitalModules;
  delete product.digitalManualPages;
  delete product.digitalFiles;
  return product;
};

const cleanBody = (body) => {
  const b = { ...body };

  if (b.images) b.images = processImages(Array.isArray(b.images) ? b.images : [b.images]);
  b.variants = parseVariants(b.variants);
  b.digitalModules = parseDigitalModules(b.digitalModules);
  b.digitalFiles = parseDigitalFiles(b.digitalFiles);
  b.digitalManualPages = parseDigitalManualPages(b.digitalManualPages);

  if (b.retailPrice !== undefined) b.retailPrice = Number(b.retailPrice) || 0;
  if (b.wholesalePrice !== undefined) b.wholesalePrice = b.wholesalePrice ? Number(b.wholesalePrice) : null;
  if (b.wholesaleMinQty !== undefined) b.wholesaleMinQty = b.wholesaleMinQty ? Number(b.wholesaleMinQty) : null;

  if (b.stock !== '' && b.stock !== undefined && b.stock !== null) b.stock = Number(b.stock);
  else b.stock = null;

  if (b.depositPercent !== undefined) b.depositPercent = b.depositPercent ? Number(b.depositPercent) : null;
  if (b.limitedAccessMonths !== undefined) b.limitedAccessMonths = Number(b.limitedAccessMonths) > 0 ? Number(b.limitedAccessMonths) : 6;
  if (b.supportEmail !== undefined) b.supportEmail = normalizeEmail(b.supportEmail);
  if (b.supportWhatsApp !== undefined) b.supportWhatsApp = normalizePhone(b.supportWhatsApp);
  if (b.category !== undefined) b.category = String(b.category || '').trim();
  if (b.digitalContentsPage !== undefined) b.digitalContentsPage = normalizeDigitalContentsPage(b.digitalContentsPage || {});
  if (b.digitalType !== undefined) b.digitalType = normalizeFlexibleOption(b.digitalType);
  if (b.digitalSkillLevel !== undefined) b.digitalSkillLevel = normalizeFlexibleOption(b.digitalSkillLevel, 'all-levels');
  if (b.digitalFormat !== undefined) b.digitalFormat = normalizeFlexibleOption(b.digitalFormat);
  if (b.digitalDuration !== undefined) b.digitalDuration = normalizeFlexibleOption(b.digitalDuration);
  if (b.digitalTopics !== undefined) b.digitalTopics = normalizeFlexibleOptionList(b.digitalTopics);
  if (b.digitalInclusions !== undefined) b.digitalInclusions = normalizeFlexibleOptionList(b.digitalInclusions);

  if (b.discount) {
    b.discount = {
      ...b.discount,
      value: Number(b.discount.value) || 0,
      limitCustomers: b.discount.limitCustomers ? Number(b.discount.limitCustomers) : null,
      startDate: b.discount.startDate || null,
      endDate: b.discount.endDate || null,
    };
  }

  if (b.preOrderType === '' || !b.isPreOrder) b.preOrderType = null;
  if (!b.isPreOrder) b.depositPercent = null;

  if (b.isDigital) {
    b.category = 'Digital Products';
    b.stock = null;
    b.wholesalePrice = null;
    b.wholesaleMinQty = null;
    b.variants = [];
    b.isPreOrder = false;
    b.preOrderType = null;
    b.depositPercent = null;
    b.digitalType = normalizeFlexibleOption(b.digitalType, 'mixed');
    b.digitalAccessKind = b.digitalAccessKind || 'paid';
    b.digitalSkillLevel = normalizeFlexibleOption(b.digitalSkillLevel, 'all-levels');
    b.digitalFormat = normalizeFlexibleOption(b.digitalFormat);
    b.digitalDuration = normalizeFlexibleOption(b.digitalDuration);
    b.digitalTopics = normalizeFlexibleOptionList(b.digitalTopics);
    b.digitalInclusions = normalizeFlexibleOptionList(b.digitalInclusions);
    b.freeTrialDays = b.digitalAccessKind === 'trial'
      ? Math.max(1, Number(b.freeTrialDays) || 7)
      : 0;
    if (b.digitalAccessKind === 'free') {
      b.retailPrice = 0;
      b.discount = null;
    }
    b.isSeries = !!b.isSeries;
    b.seriesTitle = b.isSeries ? (b.seriesTitle || '') : '';
    b.seriesDescription = b.isSeries ? (b.seriesDescription || '') : '';
    b.isCertified = !!b.isCertified;
    b.certificateTitle = b.isCertified ? (b.certificateTitle || b.name || '') : '';
    b.certificateDescription = b.isCertified ? (b.certificateDescription || '') : '';
    b.supportEmail = normalizeEmail(b.supportEmail || '');
    b.supportWhatsApp = normalizePhone(b.supportWhatsApp || '');
    b.digitalModules = normalizeDigitalModules(b.digitalModules || []);
    if (b.digitalModules.length) {
      b.digitalManualPages = [];
      b.digitalFiles = [];
    } else {
      b.digitalManualPages = (b.digitalManualPages || []).map((page) => ({
        ...page,
        pageNumber: page.pageNumber !== '' && page.pageNumber !== undefined && page.pageNumber !== null ? Number(page.pageNumber) : null,
        title: String(page.title || '').trim(),
        summary: String(page.summary || '').trim(),
        content: String(page.content || '').trim(),
        mediaPublicId: String(page.mediaPublicId || '').trim(),
      })).filter((page) => page.title || page.summary || page.content || page.mediaPublicId)
        .sort((a, bPage) => {
          const diff = manualPageRank(a) - manualPageRank(bPage);
          if (diff !== 0) return diff;
          return String(a.title || '').localeCompare(String(bPage.title || ''));
        });
      b.digitalFiles = (b.digitalFiles || []).map((file, index) => ({
        ...file,
        label: file.label || file.originalFilename || `Digital File ${index + 1}`,
        stepNumber: file.stepNumber !== '' && file.stepNumber !== undefined && file.stepNumber !== null ? Number(file.stepNumber) : null,
        stepTitle: file.stepTitle || '',
        stepSummary: file.stepSummary || '',
        allowDownload: !!file.allowDownload || !isPreviewableDigitalFile(file),
      })).sort((a, bFile) => {
        const diff = stepRank(a) - stepRank(bFile);
        if (diff !== 0) return diff;
        return String(a.label || '').localeCompare(String(bFile.label || ''));
      });
    }
    b.accessMode = b.accessMode || 'customer_choice';
    b.limitedAccessMonths = Number(b.limitedAccessMonths) > 0 ? Number(b.limitedAccessMonths) : 6;
    b.accessNote = b.accessNote || '';
    b.digitalContentsPage = normalizeDigitalContentsPage(b.digitalContentsPage || {});
  } else {
    b.digitalType = null;
    b.digitalAccessKind = 'paid';
    b.digitalSkillLevel = 'all-levels';
    b.digitalFormat = null;
    b.digitalDuration = null;
    b.digitalTopics = [];
    b.digitalInclusions = [];
    b.freeTrialDays = 0;
    b.isSeries = false;
    b.seriesTitle = '';
    b.seriesDescription = '';
    b.isCertified = false;
    b.certificateTitle = '';
    b.certificateDescription = '';
    b.accessMode = 'customer_choice';
    b.limitedAccessMonths = 6;
    b.accessNote = '';
    b.supportEmail = '';
    b.supportWhatsApp = '';
    b.digitalModules = [];
    b.digitalManualPages = [];
    b.digitalFiles = [];
    b.digitalContentsPage = normalizeDigitalContentsPage({});
  }

  return b;
};

export const getPublicProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      featured,
      fastSelling,
      isPreOrder,
      discounted,
      outOfStock,
      isDigital,
      digitalType,
      digitalSkillLevel,
      digitalFormat,
      digitalDuration,
      digitalTopics,
      digitalInclusions,
      priceType,
      minPrice,
      maxPrice,
      sort,
      limit,
    } = req.query;

    const query = { available: true };
    if (category && category !== 'All') query.category = category;
    if (isDigital === 'true') query.isDigital = true;
    if (isDigital === 'false') query.isDigital = { $ne: true };
    const normalizedDigitalType = normalizeFlexibleOption(digitalType);
    const normalizedSkillLevel = normalizeFlexibleOption(digitalSkillLevel);
    const normalizedFormat = normalizeFlexibleOption(digitalFormat);
    const normalizedDuration = normalizeFlexibleOption(digitalDuration);
    if (normalizedDigitalType && normalizedDigitalType !== 'all') query.digitalType = normalizedDigitalType;
    if (normalizedSkillLevel && normalizedSkillLevel !== 'all') query.digitalSkillLevel = normalizedSkillLevel;
    if (normalizedFormat && normalizedFormat !== 'all') query.digitalFormat = normalizedFormat;
    if (normalizedDuration && normalizedDuration !== 'all') query.digitalDuration = normalizedDuration;
    if (priceType && priceType !== 'all') {
      const normalizedPriceType = normalizeSingleOption(priceType, ['free', 'trial', 'paid']);
      if (normalizedPriceType) query.digitalAccessKind = normalizedPriceType;
    }
    const topicFilters = parseQueryList(digitalTopics);
    if (topicFilters.length) query.digitalTopics = { $in: topicFilters };
    const inclusionFilters = parseQueryList(digitalInclusions);
    if (inclusionFilters.length) query.digitalInclusions = { $in: inclusionFilters };
    if (featured === 'true') query.featured = true;
    if (fastSelling === 'true') query.fastSelling = true;
    if (isPreOrder === 'true') query.isPreOrder = true;
    if (discounted === 'true') query['discount.active'] = true;
    if (outOfStock === 'true') query.stock = 0;

    if (minPrice || maxPrice) {
      query.retailPrice = {};
      if (minPrice && !Number.isNaN(Number(minPrice))) query.retailPrice.$gte = Number(minPrice);
      if (maxPrice && !Number.isNaN(Number(maxPrice))) query.retailPrice.$lte = Number(maxPrice);
      if (Object.keys(query.retailPrice).length === 0) delete query.retailPrice;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { digitalType: { $regex: search, $options: 'i' } },
        { digitalSkillLevel: { $regex: search, $options: 'i' } },
        { digitalFormat: { $regex: search, $options: 'i' } },
        { digitalDuration: { $regex: search, $options: 'i' } },
        { digitalTopics: { $elemMatch: { $regex: search, $options: 'i' } } },
        { digitalInclusions: { $elemMatch: { $regex: search, $options: 'i' } } },
        { accessNote: { $regex: search, $options: 'i' } },
        { 'digitalModules.title': { $regex: search, $options: 'i' } },
        { 'digitalModules.description': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.title': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.description': { $regex: search, $options: 'i' } },
        { 'digitalManualPages.title': { $regex: search, $options: 'i' } },
        { 'digitalManualPages.summary': { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceAsc: { retailPrice: 1, createdAt: -1 },
      priceDesc: { retailPrice: -1, createdAt: -1 },
      nameAsc: { name: 1, createdAt: -1 },
      nameDesc: { name: -1, createdAt: -1 },
    };

    let queryBuilder = Product.find(query).sort(sortMap[sort] || sortMap.newest);
    if (limit) queryBuilder = queryBuilder.limit(Number(limit));
    const products = await queryBuilder;

    res.json(await decorateProductsWithAccess(req, products));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDiscountedProducts = async (_, res) => {
  try {
    const now = new Date();
    const products = await Product.find({
      available: true,
      'discount.active': true,
      $or: [{ 'discount.endDate': null }, { 'discount.endDate': { $gte: now } }],
    }).sort({ createdAt: -1 }).limit(12);
    res.json(products.map(toPublicProduct));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategories = async (_, res) => {
  try {
    const cats = await Product.distinct('category', { available: true });
    res.json(cats);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDigitalProductOptions = async (_, res) => {
  try {
    const filter = { available: true, isDigital: true };
    const [digitalTypes, skillLevels, formats, durations, topics, inclusions] = await Promise.all([
      Product.distinct('digitalType', filter),
      Product.distinct('digitalSkillLevel', filter),
      Product.distinct('digitalFormat', filter),
      Product.distinct('digitalDuration', filter),
      Product.distinct('digitalTopics', filter),
      Product.distinct('digitalInclusions', filter),
    ]);

    res.json({
      digitalTypes: mergeDistinctOptionValues(DIGITAL_TYPE_DEFAULTS, digitalTypes),
      digitalSkillLevels: mergeDistinctOptionValues(DIGITAL_SKILL_LEVELS, skillLevels),
      digitalFormats: mergeDistinctOptionValues(DIGITAL_FORMATS, formats),
      digitalDurations: mergeDistinctOptionValues(DIGITAL_DURATIONS, durations),
      digitalTopics: mergeDistinctOptionValues(DIGITAL_TOPICS, topics),
      digitalInclusions: mergeDistinctOptionValues(DIGITAL_INCLUSIONS, inclusions),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGoogleMerchantFeed = async (_, res) => {
  try {
    const products = await Product.find({
      available: true,
      isDigital: { $ne: true },
      'images.0': { $exists: true },
    })
      .select('name slug desc category images retailPrice stock discount isPreOrder partnerBrand available isDigital isPartner featured')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const xml = buildGoogleMerchantFeedXml(products.filter(isMerchantFeedEligible));
    res.type('application/xml').send(xml);
  } catch {
    res.status(500).json({ message: 'Could not generate the Google Merchant feed right now.' });
  }
};

export const getPublicProduct = async (req, res) => {
  try {
    const query = buildPublicIdentifierQuery(req.params.id);
    if (!query) return res.status(404).json({ message: 'Product not found' });

    const product = await Product.findOne(query);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const [publicProduct] = await decorateProductsWithAccess(req, [product]);
    res.json(publicProduct);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { search, isPartner, isDigital } = req.query;
    const query = {};

    if (isPartner === 'true') query.isPartner = true;
    if (isDigital === 'true') query.isDigital = true;
    if (isDigital === 'false') query.isDigital = { $ne: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { digitalType: { $regex: search, $options: 'i' } },
        { digitalAccessKind: { $regex: search, $options: 'i' } },
        { digitalSkillLevel: { $regex: search, $options: 'i' } },
        { digitalFormat: { $regex: search, $options: 'i' } },
        { digitalDuration: { $regex: search, $options: 'i' } },
        { digitalTopics: { $elemMatch: { $regex: search, $options: 'i' } } },
        { digitalInclusions: { $elemMatch: { $regex: search, $options: 'i' } } },
        { seriesTitle: { $regex: search, $options: 'i' } },
        { accessMode: { $regex: search, $options: 'i' } },
        { 'digitalModules.title': { $regex: search, $options: 'i' } },
        { 'digitalModules.description': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.title': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.description': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.content': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.blocks.title': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.blocks.description': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.blocks.content': { $regex: search, $options: 'i' } },
        { 'digitalModules.items.blocks.url': { $regex: search, $options: 'i' } },
        { 'digitalManualPages.title': { $regex: search, $options: 'i' } },
        { 'digitalManualPages.summary': { $regex: search, $options: 'i' } },
        { 'digitalManualPages.content': { $regex: search, $options: 'i' } },
      ];
    }

    res.json(await Product.find(query).sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(cleanBody(req.body));
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      cleanBody(req.body),
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Not found' });
    await syncDigitalAccessGrantsForProduct(product);
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    product.available = !product.available;
    await product.save();
    res.json(product);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reduceStock = async (productId, qty) => {
  try {
    const product = await Product.findById(productId);
    if (product && product.stock !== null) {
      product.stock = Math.max(0, product.stock - qty);
      if (product.discount?.active) {
        product.discount.usedCount = (product.discount.usedCount || 0) + qty;
        if (product.discount.limitCustomers && product.discount.usedCount >= product.discount.limitCustomers) {
          product.discount.active = false;
        }
      }
      await product.save();
    }
  } catch (err) {
    console.error('Stock error:', err.message);
  }
};
