import Order from '../Models/Order.mjs';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import { reduceStock } from './productController.mjs';
import axios from 'axios';

const WHATSAPP     = process.env.WHATSAPP_NUMBER;
const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

export const saveAbandonedCart = async (req, res) => {
  try {
    const { name, phone, items } = req.body;
    await AbandonedCart.findOneAndUpdate(
      { phone },
      { name, phone, items, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAbandonedCarts = async (req, res) => {
  try {
    res.json(await AbandonedCart.find().sort({ updatedAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const toggleFollowUp = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) return res.status(404).json({ message: 'Not found' });
    cart.followedUp = !cart.followedUp;
    await cart.save();
    res.json(cart);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const verifyAndCreateOrder = async (req, res) => {
  try {
    const { paymentRef, orderData } = req.body;
    console.log('ORDER VERIFY HIT - ref:', paymentRef);
    console.log('KEY:', PAYSTACK_KEY ? PAYSTACK_KEY.slice(0,15) + '...' : 'MISSING');

    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${paymentRef}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );

    const txn = verify.data?.data;
    console.log('PAYSTACK STATUS:', txn?.status, '| AMOUNT:', txn?.amount);
    if (!txn || txn.status !== 'success') {
      console.log('VERIFY FAILED:', JSON.stringify(verify.data));
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    console.log('CREATING ORDER - fulfillment:', orderData?.fulfillment, '| total:', orderData?.total);
    console.log('ORDER DATA KEYS:', Object.keys(orderData || {}));

    const order = await Order.create({
      ...orderData,
      paymentRef,
      paymentStatus: 'paid',
      status: 'new',
    });

    console.log('ORDER CREATED:', order.orderId);

    for (const item of order.items) {
      if (item.productId) await reduceStock(item.productId, item.qty);
    }

    await AbandonedCart.findOneAndDelete({ phone: orderData.customer?.phone });
    console.log('ABANDONED CART CLEARED');

    console.log('BUILDING RESPONSE - phone:', order.customer?.phone, '| orderId:', order.orderId);

    console.log('BUILDING WHATSAPP MESSAGE');
    const items = order.items.map(i =>
      `  - ${i.name || ''}${i.variant ? ` (${i.variant})` : ''} x${i.qty || 0} @ GHS ${i.price || 0}`
    ).join('\n');

    const fulfillmentLine = order.fulfillment === 'pickup'
      ? 'Fulfillment: PICKUP — customer will collect'
      : order.fulfillment === 'international'
      ? 'Fulfillment: INTERNATIONAL — arrange shipping'
      : `Delivery: ${order.deliveryZone} — GHS ${order.deliveryFee}`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

    const msg = encodeURIComponent(
`🛍️ NEW ORDER — Belle Kreyashon
━━━━━━━━━━━━━━
Order ID: ${order.orderId}
Date: ${dateStr} at ${timeStr}
Customer: ${order.customer.name}
Phone: ${order.customer.phone}
Address: ${order.customer.address || 'N/A'}
${fulfillmentLine}

ITEMS:
${items}

Subtotal: GHS ${order.subtotal}
TOTAL: GHS ${order.total}
━━━━━━━━━━━━━━
Payment: CONFIRMED ✅
Ref: ${paymentRef}`
    );

    console.log('SENDING RESPONSE');
    res.json({
      order,
      whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
      callUrl:     `tel:+${WHATSAPP}`,
    });
    console.log('RESPONSE SENT OK');
  } catch (err) {
    console.error('ORDER ERROR:', err.message);
    console.error('STACK:', err.stack);
    res.status(500).json({ message: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
    ];
    res.json(await Order.find(query).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
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
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const { phone } = req.params;
    const orders = await Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
    res.json(orders);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
