import Product from '../Models/Product.mjs';

const LIFETIME_SURCHARGE_PERCENT = 20;

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

const roundMoney = (value) => Math.round(Number(value) || 0);
const stepRank = (file = {}) => (file.stepNumber ?? Number.MAX_SAFE_INTEGER);

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
    const outline = Array.isArray(product.digitalFiles)
      ? [...product.digitalFiles]
        .map((file) => ({
          assetId: String(file._id || file.assetId || ''),
          label: file.label || file.originalFilename || 'Digital File',
          fileKind: file.fileKind || 'other',
          stepNumber: file.stepNumber ?? null,
          stepTitle: file.stepTitle || '',
          stepSummary: file.stepSummary || '',
        }))
        .sort((a, b) => {
          const aStep = a.stepNumber ?? Number.MAX_SAFE_INTEGER;
          const bStep = b.stepNumber ?? Number.MAX_SAFE_INTEGER;
          if (aStep !== bStep) return aStep - bStep;
          return a.label.localeCompare(b.label);
        })
      : [];

    product.accessMode = accessMode;
    product.limitedAccessMonths = limitedAccessMonths;
    product.digitalAccessKind = product.digitalAccessKind || 'paid';
    product.freeTrialDays = product.digitalAccessKind === 'trial'
      ? Math.max(1, Number(product.freeTrialDays) || 7)
      : 0;
    product.isSeries = !!product.isSeries;
    product.seriesTitle = product.seriesTitle || '';
    product.seriesDescription = product.seriesDescription || '';
    product.isCertified = !!product.isCertified;
    product.certificateTitle = product.certificateTitle || product.name || '';
    product.certificateDescription = product.certificateDescription || '';
    product.digitalFileCount = Array.isArray(product.digitalFiles) ? product.digitalFiles.length : 0;
    product.hasPreviewableDigitalFiles = Array.isArray(product.digitalFiles)
      ? product.digitalFiles.some((file) => ['document', 'video', 'audio', 'image'].includes(file.fileKind))
      : false;
    product.digitalOutline = outline;
    product.digitalPricing = {
      limitedPrice: pricing.limitedPrice,
      limitedBasePrice: pricing.limitedBasePrice,
      lifetimePrice: accessMode === 'limited' ? null : pricing.lifetimePrice,
      lifetimeBasePrice: accessMode === 'limited' ? null : pricing.lifetimeBasePrice,
      lifetimeMarkupPercent: LIFETIME_SURCHARGE_PERCENT,
    };
  }

  delete product.digitalFiles;
  return product;
};

const cleanBody = (body) => {
  const b = { ...body };

  if (b.images) b.images = processImages(Array.isArray(b.images) ? b.images : [b.images]);
  b.variants = parseVariants(b.variants);
  b.digitalFiles = parseDigitalFiles(b.digitalFiles);

  if (b.retailPrice !== undefined) b.retailPrice = Number(b.retailPrice) || 0;
  if (b.wholesalePrice !== undefined) b.wholesalePrice = b.wholesalePrice ? Number(b.wholesalePrice) : null;
  if (b.wholesaleMinQty !== undefined) b.wholesaleMinQty = b.wholesaleMinQty ? Number(b.wholesaleMinQty) : null;

  if (b.stock !== '' && b.stock !== undefined && b.stock !== null) b.stock = Number(b.stock);
  else b.stock = null;

  if (b.depositPercent !== undefined) b.depositPercent = b.depositPercent ? Number(b.depositPercent) : null;
  if (b.limitedAccessMonths !== undefined) b.limitedAccessMonths = Number(b.limitedAccessMonths) > 0 ? Number(b.limitedAccessMonths) : 6;

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
    b.digitalType = b.digitalType || 'mixed';
    b.digitalAccessKind = b.digitalAccessKind || 'paid';
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
    b.digitalFiles = (b.digitalFiles || []).map((file, index) => ({
      ...file,
      label: file.label || file.originalFilename || `Digital File ${index + 1}`,
      stepNumber: file.stepNumber !== '' && file.stepNumber !== undefined && file.stepNumber !== null ? Number(file.stepNumber) : null,
      stepTitle: file.stepTitle || '',
      stepSummary: file.stepSummary || '',
    })).sort((a, bFile) => {
      const diff = stepRank(a) - stepRank(bFile);
      if (diff !== 0) return diff;
      return String(a.label || '').localeCompare(String(bFile.label || ''));
    });
    b.accessMode = b.accessMode || 'customer_choice';
    b.limitedAccessMonths = Number(b.limitedAccessMonths) > 0 ? Number(b.limitedAccessMonths) : 6;
    b.accessNote = b.accessNote || '';
  } else {
    b.digitalType = null;
    b.digitalAccessKind = 'paid';
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
    b.digitalFiles = [];
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
      minPrice,
      maxPrice,
      sort,
      limit,
    } = req.query;

    const query = { available: true };
    if (category && category !== 'All') query.category = category;
    if (isDigital === 'true') query.isDigital = true;
    if (isDigital === 'false') query.isDigital = { $ne: true };
    if (digitalType && digitalType !== 'all') query.digitalType = digitalType;
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
        { accessNote: { $regex: search, $options: 'i' } },
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

    res.json(products.map(toPublicProduct));
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

export const getPublicProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, available: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(toPublicProduct(product));
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
        { seriesTitle: { $regex: search, $options: 'i' } },
        { accessMode: { $regex: search, $options: 'i' } },
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
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
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
