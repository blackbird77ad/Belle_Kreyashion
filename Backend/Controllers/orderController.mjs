import axios from 'axios';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import Customer from '../Models/Customer.mjs';
import Order from '../Models/Order.mjs';
import { grantDigitalAccessForOrder, processDueTrialCharges } from '../Services/digitalAccessService.mjs';
import { reduceStock } from './productController.mjs';

const WHATSAPP = process.env.WHATSAPP_NUMBER;
const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
const buildOrderResponse = (order, paymentRef = '') => {
  const msg = buildWhatsAppMessage(order, paymentRef || order.paymentRef || '');
  return {
    order,
    whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
    callUrl: `tel:+${WHATSAPP}`,
  };
};

const hasTrialItems = (orderData) => (orderData?.items || []).some((item) => item.isDigital && item.digitalAccessKind === 'trial');
const isFreeOnlyDigitalOrder = (orderData) => {
  const items = orderData?.items || [];
  return items.length > 0
    && items.every((item) => item.isDigital && item.digitalAccessKind === 'free')
    && Number(orderData.total || 0) === 0;
};

const buildWhatsAppMessage = (order, paymentRef) => {
  const items = (order.items || []).map((item) => {
    const accessInfo = item.isDigital
      ? ` [digital${item.digitalAccessKind ? ` - ${item.digitalAccessKind}` : ''}${item.accessType ? ` - ${item.accessType}` : ''}${item.digitalAccessKind === 'trial' && item.trialDays ? ` - ${item.trialDays}d trial` : ''}]`
      : '';
    return `- ${item.name || ''}${item.variant ? ` (${item.variant})` : ''} x${item.qty || 0} @ GHS ${item.price || 0}${accessInfo}`;
  }).join('\n');

  const fulfillmentLine = order.fulfillment === 'pickup'
    ? 'Fulfillment: PICKUP - customer will collect'
    : order.fulfillment === 'international'
      ? 'Fulfillment: INTERNATIONAL - arrange shipping'
      : order.fulfillment === 'digital'
        ? 'Fulfillment: DIGITAL - customer library access'
        : `Delivery: ${order.deliveryZone} - GHS ${order.deliveryFee}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return encodeURIComponent(
`NEW ORDER - Belle Kreyashon
----------------------
Order ID: ${order.orderId}
Date: ${dateStr} at ${timeStr}
Customer: ${order.customer?.name || ''}
Phone: ${order.customer?.phone || ''}
Email: ${order.customer?.email || 'N/A'}
Address: ${order.customer?.address || 'N/A'}
${fulfillmentLine}

ITEMS:
${items}

Subtotal: GHS ${order.subtotal}
TOTAL: GHS ${order.total}
----------------------
Payment: CONFIRMED
Ref: ${paymentRef}`
  );
};

export const saveAbandonedCart = async (req, res) => {
  try {
    const { name, phone, items } = req.body;
    await AbandonedCart.findOneAndUpdate(
      { phone },
      { name, phone, items, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAbandonedCarts = async (_, res) => {
  try {
    res.json(await AbandonedCart.find().sort({ updatedAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleFollowUp = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) return res.status(404).json({ message: 'Not found' });
    cart.followedUp = !cart.followedUp;
    await cart.save();
    res.json(cart);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyAndCreateOrder = async (req, res) => {
  try {
    const { paymentRef, orderData } = req.body;
    if (!paymentRef || !orderData) {
      return res.status(400).json({ message: 'Payment reference and order data are required' });
    }

    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${paymentRef}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );

    const txn = verify.data?.data;
    if (!txn || txn.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    if (hasTrialItems(orderData) && !txn.authorization?.reusable) {
      return res.status(400).json({
        message: 'This trial requires a reusable card authorization. Please complete checkout with a card and try again.',
      });
    }

    const normalizedOrderData = {
      ...orderData,
      customer: {
        ...(orderData.customer || {}),
        email: orderData.customer?.email || txn.customer?.email || '',
      },
    };

    const order = await Order.create({
      ...normalizedOrderData,
      paymentRef,
      paymentStatus: 'paid',
      paymentPurpose: orderData.paymentPurpose || 'purchase',
      paystackChargedAmount: Number(txn.amount || 0) / 100,
      billingState: hasTrialItems(orderData) ? 'trialing' : 'paid',
      status: 'new',
    });

    if (txn.customer?.customer_code && order.customer?.customerId) {
      await Customer.findOneAndUpdate(
        { customerId: order.customer.customerId },
        {
          paystackCustomerCode: txn.customer.customer_code,
          ...(order.customer?.email ? { email: order.customer.email } : {}),
        }
      ).catch(() => {});
    }

    for (const item of order.items || []) {
      if (item.productId) {
        await reduceStock(item.productId, item.qty);
      }
    }

    try {
      await grantDigitalAccessForOrder(order, {
        authorization: txn.authorization,
        customer: txn.customer,
        paymentRef,
        paystackAmount: Number(txn.amount || 0) / 100,
      });
    } catch (digitalErr) {
      console.error('Digital access grant error:', digitalErr.message);
    }

    await AbandonedCart.findOneAndDelete({ phone: order.customer?.phone || normalizedOrderData.customer?.phone });
    res.json(buildOrderResponse(order, paymentRef));
  } catch (err) {
    console.error('Order verification error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const createFreeDigitalOrder = async (req, res) => {
  try {
    const { orderData } = req.body;
    if (!orderData) return res.status(400).json({ message: 'Order data is required' });
    if (!isFreeOnlyDigitalOrder(orderData)) {
      return res.status(400).json({ message: 'This endpoint only supports free digital products' });
    }

    const paymentRef = `FREE-DIGITAL-${Date.now()}`;
    const normalizedOrderData = {
      ...orderData,
      customer: {
        ...(orderData.customer || {}),
        email: orderData.customer?.email || '',
      },
    };
    const order = await Order.create({
      ...normalizedOrderData,
      paymentRef,
      paymentStatus: 'paid',
      paymentPurpose: 'free_claim',
      paystackChargedAmount: 0,
      billingState: 'paid',
      status: 'new',
    });

    await grantDigitalAccessForOrder(order, {
      paymentRef,
      paystackAmount: 0,
    });

    await AbandonedCart.findOneAndDelete({ phone: order.customer?.phone || normalizedOrderData.customer?.phone });
    res.status(201).json(buildOrderResponse(order, paymentRef));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
      ];
    }

    res.json(await Order.find(query).sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    order.status = status;
    if (status === 'delivered') order.deliveredAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const { phone } = req.params;
    const orders = await Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const runDigitalTrialBillingTrigger = async (req, res) => {
  try {
    const processed = await processDueTrialCharges();
    res.json({
      message: 'Digital trial billing trigger completed',
      processed,
      authType: req.cronAuthType || 'unknown',
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
