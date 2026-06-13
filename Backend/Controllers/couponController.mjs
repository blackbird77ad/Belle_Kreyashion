import Coupon from '../Models/Coupon.mjs';

const cleanCouponBody = (body = {}) => ({
  code: String(body.code || '').trim().toUpperCase(),
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  type: body.type || 'percent',
  value: Number(body.value) || 0,
  minSubtotal: Number(body.minSubtotal) || 0,
  maxDiscount: body.maxDiscount === '' || body.maxDiscount === null || body.maxDiscount === undefined ? null : Number(body.maxDiscount),
  usageLimit: body.usageLimit === '' || body.usageLimit === null || body.usageLimit === undefined ? null : Number(body.usageLimit),
  perCustomerLimit: Number(body.perCustomerLimit) || 1,
  active: body.active !== false,
  startDate: body.startDate || null,
  endDate: body.endDate || null,
  applicableProductIds: Array.isArray(body.applicableProductIds) ? body.applicableProductIds.filter(Boolean) : [],
  applicableCategories: Array.isArray(body.applicableCategories) ? body.applicableCategories.map((item) => String(item).trim()).filter(Boolean) : [],
  customerSegment: body.customerSegment || 'all',
  campaignName: String(body.campaignName || '').trim(),
  referralCode: String(body.referralCode || '').trim(),
});

export const getCoupons = async (_, res) => {
  try { res.json(await Coupon.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ message: 'Could not load coupons' }); }
};

export const createCoupon = async (req, res) => {
  try { res.status(201).json(await Coupon.create(cleanCouponBody(req.body))); }
  catch (error) { res.status(error?.code === 11000 ? 409 : 400).json({ message: error?.code === 11000 ? 'That coupon code already exists' : error.message }); }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, cleanCouponBody(req.body), { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (error) { res.status(error?.code === 11000 ? 409 : 400).json({ message: error?.code === 11000 ? 'That coupon code already exists' : error.message }); }
};

export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.active = !coupon.active;
    await coupon.save();
    res.json(coupon);
  } catch { res.status(500).json({ message: 'Could not update coupon' }); }
};

export const deleteCoupon = async (req, res) => {
  try { await Coupon.findByIdAndDelete(req.params.id); res.json({ message: 'Coupon deleted' }); }
  catch { res.status(500).json({ message: 'Could not delete coupon' }); }
};
