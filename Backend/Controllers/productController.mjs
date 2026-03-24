import Product from '../Models/Product.mjs';

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

const cleanBody = (body) => {
  const b = { ...body };
  if (b.images) b.images = processImages(Array.isArray(b.images) ? b.images : [b.images]);
  if (b.preOrderType === '' || !b.isPreOrder) b.preOrderType = null;
  if (!b.isPreOrder) b.depositPercent = null;
  b.variants = parseVariants(b.variants);
  if (b.retailPrice) b.retailPrice = Number(b.retailPrice);
  if (b.wholesalePrice) b.wholesalePrice = Number(b.wholesalePrice) || null;
  if (b.wholesaleMinQty) b.wholesaleMinQty = Number(b.wholesaleMinQty) || null;
  if (b.stock !== '' && b.stock !== undefined && b.stock !== null) b.stock = Number(b.stock);
  else b.stock = null;
  if (b.discount) {
    b.discount.value = Number(b.discount.value) || 0;
    if (b.discount.limitCustomers) b.discount.limitCustomers = Number(b.discount.limitCustomers) || null;
    else b.discount.limitCustomers = null;
    if (!b.discount.startDate) b.discount.startDate = null;
    if (!b.discount.endDate) b.discount.endDate = null;
  }
  return b;
};

export const getPublicProducts = async (req, res) => {
  try {
    const { category, search, featured, fastSelling, isPreOrder, limit } = req.query;
    const query = { available: true };
    if (category && category !== 'All') query.category = category;
    if (featured === 'true') query.featured = true;
    if (fastSelling === 'true') query.fastSelling = true;
    if (isPreOrder === 'true') query.isPreOrder = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { desc: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
    let q = Product.find(query).sort({ createdAt: -1 });
    if (limit) q = q.limit(Number(limit));
    res.json(await q);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getDiscountedProducts = async (req, res) => {
  try {
    const now = new Date();
    const products = await Product.find({
      available: true,
      'discount.active': true,
      $or: [{ 'discount.endDate': null }, { 'discount.endDate': { $gte: now } }],
    }).sort({ createdAt: -1 }).limit(12);
    res.json(products);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getCategories = async (req, res) => {
  try {
    const cats = await Product.distinct('category', { available: true });
    res.json(cats);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getPublicProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, available: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllProducts = async (req, res) => {
  try {
    const { search, isPartner } = req.query;
    const query = {};
    if (isPartner === 'true') query.isPartner = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
    res.json(await Product.find(query).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(cleanBody(req.body));
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, cleanBody(req.body), { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteProduct = async (req, res) => {
  try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch { res.status(500).json({ message: 'Server error' }); }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    product.available = !product.available;
    await product.save();
    res.json(product);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const reduceStock = async (productId, qty) => {
  try {
    console.log('REDUCE STOCK - productId:', productId, '| qty:', qty);
    const p = await Product.findById(productId);
    console.log('FOUND PRODUCT:', p?.name, '| stock:', p?.stock);
    if (p && p.stock !== null) {
      p.stock = Math.max(0, p.stock - qty);
      console.log('NEW STOCK:', p.stock);
      if (p.discount?.active) {
        p.discount.usedCount = (p.discount.usedCount || 0) + qty;
        if (p.discount.limitCustomers && p.discount.usedCount >= p.discount.limitCustomers) p.discount.active = false;
      }
      await p.save();
    }
  } catch (err) { console.error('Stock error:', err.message); }
};
