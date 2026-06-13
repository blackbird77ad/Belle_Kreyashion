import Coupon from '../Models/Coupon.mjs';
import Order from '../Models/Order.mjs';

const normalizeCustomerKey = (customer = {}) => (
  String(customer.customerId || customer.email || customer.phone || '').trim().toLowerCase()
);

const isWithinWindow = (coupon, now = new Date()) => (
  (!coupon.startDate || new Date(coupon.startDate) <= now)
  && (!coupon.endDate || new Date(coupon.endDate) >= now)
);

const eligibleSubtotalForCoupon = (coupon, items = []) => {
  const productIds = new Set((coupon.applicableProductIds || []).map(String));
  const categories = new Set((coupon.applicableCategories || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  const unrestricted = productIds.size === 0 && categories.size === 0;

  return items.reduce((total, item) => {
    const eligible = unrestricted
      || productIds.has(String(item.productId || ''))
      || categories.has(String(item.category || '').trim().toLowerCase());
    return eligible ? total + ((Number(item.price) || 0) * (Number(item.qty) || 0)) : total;
  }, 0);
};

export const validateCouponForOrder = async ({ code = '', items = [], subtotal = 0, deliveryFee = 0, customer = {} }) => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return null;

  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon || !coupon.active) throw new Error('This coupon is not active');
  if (!isWithinWindow(coupon)) throw new Error('This coupon is not available right now');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('This coupon has reached its usage limit');
  if (Number(subtotal) < Number(coupon.minSubtotal || 0)) {
    throw new Error(`This coupon requires a minimum subtotal of GHS ${Number(coupon.minSubtotal || 0).toLocaleString()}`);
  }

  const customerKey = normalizeCustomerKey(customer);
  if (customerKey && coupon.perCustomerLimit) {
    const customerUses = (coupon.redemptions || []).filter((entry) => entry.customerKey === customerKey).length;
    if (customerUses >= coupon.perCustomerLimit) throw new Error('This coupon has already been used the maximum number of times for this customer');
  }

  if (coupon.customerSegment !== 'all' && customerKey) {
    const priorOrders = await Order.countDocuments({
      paymentStatus: 'paid',
      $or: [
        { 'customer.customerId': customer.customerId || '__none__' },
        { 'customer.email': customer.email || '__none__' },
        { 'customer.phone': customer.phone || '__none__' },
      ],
    });
    if (coupon.customerSegment === 'new' && priorOrders > 0) throw new Error('This coupon is for first-time customers only');
    if (coupon.customerSegment === 'returning' && priorOrders === 0) throw new Error('This coupon is for returning customers only');
  }

  const eligibleSubtotal = eligibleSubtotalForCoupon(coupon, items);
  if (coupon.type !== 'free_shipping' && eligibleSubtotal <= 0) throw new Error('This coupon does not apply to the products in this cart');

  let discountAmount = 0;
  if (coupon.type === 'percent') discountAmount = eligibleSubtotal * (Number(coupon.value) / 100);
  if (coupon.type === 'fixed') discountAmount = Math.min(eligibleSubtotal, Number(coupon.value) || 0);
  if (coupon.type === 'free_shipping') discountAmount = Number(deliveryFee) || 0;
  if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount) || 0);
  }
  discountAmount = Number(Math.max(0, discountAmount).toFixed(2));

  return {
    coupon,
    snapshot: {
      couponId: coupon._id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      campaignName: coupon.campaignName || '',
      referralCode: coupon.referralCode || '',
    },
  };
};

export const redeemOrderCoupon = async (order) => {
  if (!order?.coupon?.couponId || order.coupon.redeemedAt) return;
  const customerKey = normalizeCustomerKey(order.customer || {});
  const currentCoupon = await Coupon.findById(order.coupon.couponId).select('_id');
  if (!currentCoupon) throw new Error('Coupon no longer exists');
  const coupon = await Coupon.findOneAndUpdate(
    { _id: order.coupon.couponId },
    {
      $inc: { usedCount: 1 },
      $push: {
        redemptions: {
          orderId: order._id,
          customerKey,
          amount: Number(order.coupon.discountAmount) || 0,
          redeemedAt: new Date(),
        },
      },
    },
    { new: true }
  );
  if (!coupon) throw new Error('Coupon redemption could not be recorded');
  order.coupon.redeemedAt = new Date();
  await order.save();
};
