import crypto from 'node:crypto';
import axios from 'axios';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import Coupon from '../Models/Coupon.mjs';
import Customer from '../Models/Customer.mjs';
import DeliveryZone from '../Models/DeliveryZone.mjs';
import Order from '../Models/Order.mjs';
import Product from '../Models/Product.mjs';
import { grantDigitalAccessForOrder } from './digitalAccessService.mjs';
import {
  sendAdminOrderNotificationEmail,
  sendCustomerAccountSetupEmail,
  sendCustomerOrderEmail,
} from './customerMailService.mjs';
import { sendMetaOrderEvent } from './metaConversionsService.mjs';
import { sendServerOrderEvent } from './serverTagService.mjs';
import { redeemOrderCoupon, validateCouponForOrder } from './couponService.mjs';

const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
const DEFAULT_FRONTEND_BASE_URL = 'https://bellekreyashon.com';

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizePhone = (value = '') => {
  const cleaned = String(value || '').replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};
const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));
const createReference = (prefix = 'BK') => `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const hashText = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const isDiscountActive = (discount = {}) => {
  const now = new Date();
  return !!discount.active
    && (!discount.startDate || new Date(discount.startDate) <= now)
    && (!discount.endDate || new Date(discount.endDate) >= now)
    && (!discount.limitCustomers || Number(discount.usedCount || 0) < Number(discount.limitCustomers));
};
const calculateProductPrice = (product, item) => {
  if (item.isWholesale) {
    if (!product.wholesalePrice || Number(item.qty) < Number(product.wholesaleMinQty || 1)) {
      throw new Error(`${product.name} does not meet the wholesale minimum quantity`);
    }
    return Number(product.wholesalePrice);
  }
  const variant = item.variant
    ? (product.variants || []).find((entry) => String(entry.name || '').trim() === String(item.variant || '').trim())
    : null;
  let price = variant?.price !== null && variant?.price !== undefined ? Number(variant.price) : Number(product.retailPrice);
  if (isDiscountActive(product.discount || {})) {
    price = product.discount.type === 'percent'
      ? price * (1 - Number(product.discount.value || 0) / 100)
      : Math.max(0, price - Number(product.discount.value || 0));
  }
  if (product.isDigital && product.digitalAccessKind !== 'paid') return 0;
  return roundMoney(price);
};

const buildCanonicalItems = async (rawItems = []) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error('Your cart is empty');
  const ids = [...new Set(rawItems.map((item) => String(item.productId || '')).filter(Boolean))];
  const products = await Product.find({ _id: { $in: ids }, available: true });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return rawItems.map((item) => {
    const product = productMap.get(String(item.productId || ''));
    if (!product) throw new Error('One of the products in your cart is no longer available');
    const qty = product.isDigital ? 1 : Math.max(1, Math.floor(Number(item.qty) || 1));
    if (!product.isDigital && product.stock !== null && Number(product.stock) < qty) {
      throw new Error(`${product.name} only has ${Math.max(0, Number(product.stock) || 0)} item(s) available`);
    }
    const price = calculateProductPrice(product, { ...item, qty });
    return {
      productId: product._id,
      slug: product.slug || '',
      name: product.name,
      brand: product.partnerBrand || 'Belle Kreyashon',
      category: product.category || '',
      qty,
      price,
      isWholesale: !!item.isWholesale,
      isDigital: !!product.isDigital,
      digitalAccessKind: product.isDigital ? (product.digitalAccessKind || 'paid') : null,
      trialDays: product.isDigital && product.digitalAccessKind === 'trial' ? Math.max(1, Number(product.freeTrialDays) || 7) : null,
      trialChargeAmount: product.isDigital && product.digitalAccessKind === 'trial' ? Number(product.retailPrice) || 0 : null,
      accessType: item.accessType || null,
      accessMonths: item.accessMonths || null,
      variant: item.variant || null,
      sourceAttribution: item.sourceAttribution || null,
    };
  });
};

const resolveDelivery = async ({ items, fulfillment, deliveryZoneId, address }) => {
  const digitalOnly = items.every((item) => item.isDigital);
  if (digitalOnly) return { fulfillment: 'digital', deliveryZone: 'Digital Delivery', deliveryFee: 0, address: 'DIGITAL ACCESS' };
  const normalizedFulfillment = ['pickup', 'delivery', 'arranged-delivery', 'international'].includes(fulfillment) ? fulfillment : 'delivery';
  if (normalizedFulfillment === 'delivery') {
    const zone = await DeliveryZone.findOne({ _id: deliveryZoneId, active: true });
    if (!zone) throw new Error('Please select an active delivery zone');
    if (!String(address || '').trim()) throw new Error('Delivery address is required');
    return { fulfillment: 'delivery', deliveryZone: zone.name, deliveryFee: Number(zone.fee) || 0, address: String(address).trim() };
  }
  if (normalizedFulfillment === 'international' && !String(address || '').trim()) throw new Error('International delivery address is required');
  return {
    fulfillment: normalizedFulfillment,
    deliveryZone: normalizedFulfillment === 'pickup' ? 'Pickup' : normalizedFulfillment === 'international' ? 'International' : 'Customer-arranged delivery',
    deliveryFee: 0,
    address: normalizedFulfillment === 'pickup' ? 'PICKUP' : String(address || '').trim() || 'ARRANGED DELIVERY - CONFIRM ON WHATSAPP',
  };
};

export const buildOrderQuote = async ({ orderData = {}, authenticatedCustomer = null } = {}) => {
  const rawCustomer = orderData.customer || {};
  const customer = {
    name: String(rawCustomer.name || authenticatedCustomer?.name || '').trim(),
    phone: normalizePhone(rawCustomer.phone || authenticatedCustomer?.phone),
    email: normalizeEmail(rawCustomer.email || authenticatedCustomer?.email),
    customerId: authenticatedCustomer?.customerId || '',
    isGuest: !authenticatedCustomer?.customerId,
    billingAddress: String(rawCustomer.billingAddress || '').trim(),
  };
  if (!customer.name || !customer.phone || !customer.email) throw new Error('Name, phone number and email are required for checkout');

  const items = await buildCanonicalItems(orderData.items || []);
  const delivery = await resolveDelivery({
    items,
    fulfillment: orderData.fulfillment,
    deliveryZoneId: orderData.deliveryZoneId,
    address: orderData.address || rawCustomer.address,
  });
  customer.address = delivery.address;
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.qty, 0));
  const couponResult = await validateCouponForOrder({
    code: orderData.couponCode,
    items,
    subtotal,
    deliveryFee: delivery.deliveryFee,
    customer,
  });
  const discountTotal = roundMoney(couponResult?.snapshot?.discountAmount || 0);
  const total = roundMoney(Math.max(0, subtotal + delivery.deliveryFee - discountTotal));
  const hasTrialItems = items.some((item) => item.isDigital && item.digitalAccessKind === 'trial');
  const freeOnlyDigital = items.every((item) => item.isDigital && item.digitalAccessKind === 'free') && total === 0;
  const expectedPaymentAmount = hasTrialItems && total === 0 ? 0.1 : total;

  return {
    customer,
    items,
    subtotal,
    discountTotal,
    coupon: couponResult?.snapshot || null,
    ...delivery,
    total,
    expectedPaymentAmount: roundMoney(expectedPaymentAmount),
    hasTrialItems,
    freeOnlyDigital,
    orderType: items.every((item) => item.isDigital) ? 'digital' : delivery.fulfillment === 'international' ? 'international' : 'standard',
    paymentPurpose: freeOnlyDigital ? 'free_claim' : hasTrialItems && total === 0 ? 'trial_setup' : 'purchase',
  };
};

export const createPendingOrder = async ({ orderData = {}, paymentMethod = 'paystack', authenticatedCustomer = null } = {}) => {
  const quote = await buildOrderQuote({ orderData, authenticatedCustomer });
  const method = quote.freeOnlyDigital
    ? 'free'
    : quote.hasTrialItems
      ? 'card'
      : ['card', 'mobile_money', 'bank_transfer', 'paystack'].includes(paymentMethod) ? paymentMethod : 'paystack';
  const prefix = method === 'bank_transfer' ? 'BANK' : quote.freeOnlyDigital ? 'FREE' : 'BK';
  const paymentRef = createReference(prefix);
  const bankTransfer = method === 'bank_transfer' ? {
    accountName: String(process.env.BANK_TRANSFER_ACCOUNT_NAME || '').trim(),
    bankName: String(process.env.BANK_TRANSFER_BANK_NAME || '').trim(),
    accountNumber: String(process.env.BANK_TRANSFER_ACCOUNT_NUMBER || '').trim(),
    instructions: String(process.env.BANK_TRANSFER_INSTRUCTIONS || 'Use your order ID as the payment reference, then send the receipt to Belle Kreyashon for verification.').trim(),
  } : undefined;
  if (method === 'bank_transfer' && (!bankTransfer.accountName || !bankTransfer.bankName || !bankTransfer.accountNumber)) {
    throw new Error('Bank transfer is not configured yet');
  }

  const order = await Order.create({
    ...quote,
    sourceAttribution: orderData.sourceAttribution || null,
    sourcePages: Array.isArray(orderData.sourcePages) ? orderData.sourcePages : [],
    paymentRef,
    paymentMethod: method,
    paymentProvider: method === 'bank_transfer' || method === 'free' ? 'manual' : 'paystack',
    paymentStatus: method === 'bank_transfer' ? 'awaiting-verification' : 'pending',
    bankTransfer,
    billingState: quote.hasTrialItems ? 'trialing' : 'not-applicable',
    paymentEvents: [{
      type: 'order_created',
      source: 'checkout',
      status: method === 'bank_transfer' ? 'awaiting-verification' : 'pending',
      reference: paymentRef,
      amount: quote.expectedPaymentAmount,
    }],
  });

  return { order, quote };
};

export const verifyPaystackTransaction = async (paymentRef) => {
  if (!PAYSTACK_KEY) throw new Error('Paystack secret key is not configured');
  const { data } = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentRef)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
  );
  return data?.data || null;
};

const ensureDigitalCustomer = async (order) => {
  if (!(order.items || []).some((item) => item.isDigital)) return null;
  const email = normalizeEmail(order.customer?.email);
  const phone = normalizePhone(order.customer?.phone);
  let customer = order.customer?.customerId ? await Customer.findOne({ customerId: order.customer.customerId }) : null;
  if (!customer && email) customer = await Customer.findOne({ email });
  if (!customer && phone) customer = await Customer.findOne({ phone });
  let setupToken = '';
  if (!customer) {
    customer = await Customer.create({ name: order.customer.name, phone, email });
  }
  if (!customer.passwordHash && email) {
    setupToken = crypto.randomBytes(24).toString('hex');
    customer.passwordResetTokenHash = hashText(setupToken);
    customer.passwordResetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  if (order.customer.name && !customer.name) customer.name = order.customer.name;
  if (order.customer.billingAddress) customer.billingAddress = order.customer.billingAddress;
  await customer.save();
  order.customer.customerId = customer.customerId;
  order.customer.isGuest = false;
  await order.save();

  if (setupToken) {
    const base = String(process.env.SITE_URL || process.env.FRONTEND_URL || DEFAULT_FRONTEND_BASE_URL).replace(/\/+$/, '');
    const setupUrl = `${base}/account/reset-password?token=${encodeURIComponent(setupToken)}`;
    await sendCustomerAccountSetupEmail({ customer, setupUrl }).catch((error) => {
      console.error('Digital customer setup email failed:', error.message);
    });
  }
  return customer;
};

const commitInventory = async (order) => {
  if (order.inventoryCommitted) return;
  const committed = [];
  try {
    for (const item of order.items || []) {
      if (!item.productId || item.isDigital) continue;
      const product = await Product.findById(item.productId);
      if (!product) throw new Error(`${item.name} no longer exists`);
      if (product.stock !== null) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.qty } },
          { $inc: { stock: -Number(item.qty || 0) } },
          { new: true }
        );
        if (!updated) throw new Error(`${item.name} no longer has enough stock`);
        committed.push({ productId: item.productId, qty: Number(item.qty || 0) });
      }
      if (isDiscountActive(product.discount || {})) {
        await Product.updateOne({ _id: item.productId }, { $inc: { 'discount.usedCount': 1 } });
      }
    }
  } catch (error) {
    await Promise.all(committed.map((entry) => Product.updateOne({ _id: entry.productId }, { $inc: { stock: entry.qty } })));
    throw error;
  }
  order.inventoryCommitted = true;
  await order.save();
};

export const finalizePaidOrder = async ({ order: orderInput, transaction = null, source = 'system', requestContext = {} } = {}) => {
  const orderId = orderInput?._id || orderInput;
  let order = await Order.findOneAndUpdate(
    { _id: orderId, finalizationState: { $in: ['pending', 'failed'] } },
    { $set: { finalizationState: 'processing', finalizationError: '' } },
    { new: true }
  );
  if (!order) {
    order = await Order.findById(orderId);
    if (order?.finalizationState === 'completed') return order;
    throw new Error('Order finalization is already in progress');
  }

  try {
    if (transaction) {
      if (transaction.status !== 'success') throw new Error('Payment verification failed');
      const paidAmount = roundMoney(Number(transaction.amount || 0) / 100);
      if (Math.abs(paidAmount - Number(order.expectedPaymentAmount || 0)) > 0.01) {
        throw new Error(`Payment amount mismatch: expected GHS ${order.expectedPaymentAmount}, received GHS ${paidAmount}`);
      }
      if ((order.items || []).some((item) => item.digitalAccessKind === 'trial') && !transaction.authorization?.reusable) {
        throw new Error('This trial requires a reusable card authorization');
      }
      order.paystackChargedAmount = paidAmount;
      order.paymentChannel = transaction.channel || transaction.authorization?.channel || '';
      order.paymentProvider = 'paystack';
    } else {
      order.paystackChargedAmount = order.paymentMethod === 'free' ? 0 : Number(order.expectedPaymentAmount || 0);
      order.paymentChannel = order.paymentMethod;
    }
    order.paymentStatus = 'paid';
    order.paidAt = order.paidAt || new Date();
    order.billingState = (order.items || []).some((item) => item.digitalAccessKind === 'trial') ? 'trialing' : 'paid';
    order.paymentEvents.push({
      type: 'payment_confirmed',
      source,
      status: 'paid',
      message: source === 'admin' ? 'Payment confirmed manually by admin' : 'Payment confirmed',
      reference: order.paymentRef,
      amount: order.paystackChargedAmount,
      channel: order.paymentChannel,
    });
    await order.save();

    await commitInventory(order);
    await redeemOrderCoupon(order);
    const digitalCustomer = await ensureDigitalCustomer(order);
    if ((order.items || []).some((item) => item.isDigital) && !order.digitalAccessGranted) {
      await grantDigitalAccessForOrder(order, {
        authorization: transaction?.authorization,
        customer: transaction?.customer || digitalCustomer,
        paymentRef: order.paymentRef,
        paystackAmount: order.paystackChargedAmount,
      });
      order.digitalAccessGranted = true;
      await order.save();
    }

    if (!order.notificationsSent) {
      await Promise.allSettled([
        sendAdminOrderNotificationEmail({ order }),
        sendCustomerOrderEmail({ order }),
      ]);
      order.notificationsSent = true;
      await order.save();
    }

    sendMetaOrderEvent(order, requestContext).catch((error) => console.error('Meta purchase tracking error:', error.message));
    sendServerOrderEvent(order).catch((error) => console.error('Server purchase tracking error:', error.message));
    await AbandonedCart.updateMany(
      { $or: [{ phone: order.customer?.phone }, { email: order.customer?.email }] },
      { $set: { status: 'converted', recoveredAt: new Date(), followedUp: true } }
    );

    order.finalizationState = 'completed';
    order.finalizedAt = new Date();
    order.finalizationError = '';
    await order.save();
    return order;
  } catch (error) {
    order.finalizationState = 'failed';
    order.finalizationError = String(error.message || error).slice(0, 500);
    order.paymentEvents.push({ type: 'finalization_failed', source: 'system', status: 'failed', message: order.finalizationError, reference: order.paymentRef });
    await order.save().catch(() => {});
    throw error;
  }
};

export const finalizeFreeOrder = async (order) => finalizePaidOrder({ order, source: 'system' });

export const recordCouponRedemptionRollback = async (order) => {
  if (!order?.coupon?.couponId || !order.coupon.redeemedAt) return;
  await Coupon.updateOne(
    { _id: order.coupon.couponId },
    { $inc: { usedCount: -1 }, $pull: { redemptions: { orderId: order._id } } }
  );
};

export const buildPaymentPublicState = (order) => ({
  order,
  payment: {
    reference: order.paymentRef,
    status: order.paymentStatus,
    method: order.paymentMethod,
    channel: order.paymentChannel,
    expectedAmount: order.expectedPaymentAmount,
    bankTransfer: order.paymentMethod === 'bank_transfer' ? order.bankTransfer : null,
    finalizationState: order.finalizationState,
  },
});

export const hashPaystackPayload = (rawBody) => crypto.createHmac('sha512', PAYSTACK_KEY || '').update(rawBody).digest('hex');
