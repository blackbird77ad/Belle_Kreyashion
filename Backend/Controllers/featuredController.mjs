import Featured from '../Models/Featured.mjs';

export const getActiveFeatured = async (req, res) => {
  try {
    const now = new Date();
    const items = await Featured.find({ active: true, subscriptionEnd: { $gte: now } }).sort({ createdAt: -1 });
    res.json(items);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllFeatured = async (req, res) => {
  try {
    res.json(await Featured.find().sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createFeatured = async (req, res) => {
  try {
    const { plan, price, stock, ...rest } = req.body;
    const start = new Date();
    const end   = new Date();
    end.setMonth(end.getMonth() + Number(plan));
    const item = await Featured.create({
      ...rest,
      plan:  Number(plan),
      price: price ? Number(price) : null,
      stock: stock !== '' && stock !== undefined ? Number(stock) : null,
      subscriptionStart: start,
      subscriptionEnd:   end,
    });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateFeatured = async (req, res) => {
  try {
    const item = await Featured.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteFeatured = async (req, res) => {
  try {
    await Featured.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const toggleFeatured = async (req, res) => {
  try {
    const item = await Featured.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    item.active = !item.active;
    await item.save();
    res.json(item);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
