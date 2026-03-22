import Product from '../Models/Product.mjs';

export const getPublicProducts = async (req, res) => {
  try {
    const { category, search, featured } = req.query;
    const query = { available: true };
    if (category && category !== 'All') query.category = category;
    if (featured) query.featured = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { desc: { $regex: search, $options: 'i' } },
    ];
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
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
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
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
