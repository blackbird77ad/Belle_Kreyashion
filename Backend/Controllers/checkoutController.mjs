import crypto from 'node:crypto';
import Order from '../Models/Order.mjs';
import { readOptionalCustomerAuth } from '../Middlewares/auth.mjs';
import {
  buildOrderQuote,
  buildPaymentPublicState,
  createPendingOrder,
  finalizeFreeOrder,
  finalizePaidOrder,
  hashPaystackPayload,
  verifyPaystackTransaction,
} from '../Services/checkoutService.mjs';

const WHATSAPP = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
const buildOrderResponse = (order) => {
  const message = encodeURIComponent(`Hello Belle Kreyashon, I am following up on order ${order.orderId || ''}. Payment reference: ${order.paymentRef || ''}.`);
  return {
    ...buildPaymentPublicState(order),
    whatsappUrl: WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${message}` : '',
    callUrl: WHATSAPP ? `tel:+${WHATSAPP}` : '',
  };
};

const getRequestContext = (req, browserData = {}) => ({
  browserData,
  clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
  userAgent: req.get('user-agent') || '',
});
const isLegacyPaidOrder = (order) => order?.paymentStatus === 'paid'
  && !order.finalizedAt
  && (!Array.isArray(order.paymentEvents) || order.paymentEvents.length === 0);

export const quoteCheckout = async (req, res) => {
  try {
    const authenticatedCustomer = await readOptionalCustomerAuth(req);
    const quote = await buildOrderQuote({ orderData: req.body?.orderData || req.body, authenticatedCustomer });
    res.json({ quote });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not calculate checkout' });
  }
};

export const initializeCheckout = async (req, res) => {
  try {
    const authenticatedCustomer = await readOptionalCustomerAuth(req);
    const { order, quote } = await createPendingOrder({
      orderData: req.body?.orderData || {},
      paymentMethod: req.body?.paymentMethod || 'paystack',
      authenticatedCustomer,
    });

    if (quote.freeOnlyDigital) {
      const completed = await finalizeFreeOrder(order);
      return res.status(201).json(buildOrderResponse(completed));
    }

    res.status(201).json(buildOrderResponse(order));
  } catch (error) {
    const status = /not configured|not available|requires|required|minimum|stock|coupon|cart/i.test(error.message || '') ? 400 : 500;
    res.status(status).json({ message: error.message || 'Could not initialize checkout' });
  }
};

export const verifyCheckoutPayment = async (req, res) => {
  try {
    const paymentRef = String(req.body?.paymentRef || '').trim();
    if (!paymentRef) return res.status(400).json({ message: 'Payment reference is required' });
    const order = await Order.findOne({ paymentRef });
    if (!order) return res.status(404).json({ message: 'Pending order not found for this payment' });
    if ((order.paymentStatus === 'paid' && order.finalizationState === 'completed') || isLegacyPaidOrder(order)) return res.json(buildOrderResponse(order));
    if (order.paymentMethod === 'bank_transfer') return res.json(buildOrderResponse(order));

    const transaction = await verifyPaystackTransaction(paymentRef);
    const completed = await finalizePaidOrder({
      order,
      transaction,
      source: 'browser',
      requestContext: getRequestContext(req, req.body?.browserData || {}),
    });
    res.json(buildOrderResponse(completed));
  } catch (error) {
    const status = /not found/i.test(error.message || '') ? 404 : /mismatch|failed|requires/i.test(error.message || '') ? 400 : 500;
    res.status(status).json({ message: error.message || 'Could not verify payment' });
  }
};

export const receivePaystackWebhook = async (req, res) => {
  try {
    const signature = String(req.headers['x-paystack-signature'] || '');
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = hashPaystackPayload(rawBody);
    const valid = signature && expected && signature.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) return res.status(401).json({ message: 'Invalid Paystack signature' });

    const event = req.body || {};
    if (event.event !== 'charge.success') return res.sendStatus(200);
    const reference = String(event.data?.reference || '').trim();
    const order = await Order.findOne({ paymentRef: reference });
    if (!order) return res.sendStatus(200);
    if ((order.paymentStatus === 'paid' && order.finalizationState === 'completed') || isLegacyPaidOrder(order)) return res.sendStatus(200);

    await finalizePaidOrder({ order, transaction: event.data, source: 'webhook', requestContext: getRequestContext(req) });
    res.sendStatus(200);
  } catch (error) {
    console.error('Paystack webhook error:', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

export const getPaymentState = async (req, res) => {
  try {
    const order = await Order.findOne({ paymentRef: String(req.params.reference || '').trim() });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(buildOrderResponse(order));
  } catch {
    res.status(500).json({ message: 'Could not load payment status' });
  }
};

export const getAdminPayments = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.paymentStatus = req.query.status;
    if (req.query.method) query.paymentMethod = req.query.method;
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(500);
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Could not load payments' });
  }
};

export const confirmManualPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentMethod !== 'bank_transfer') return res.status(400).json({ message: 'This is not a bank-transfer order' });
    order.bankTransfer.reviewedAt = new Date();
    order.bankTransfer.reviewNote = String(req.body?.note || '').trim();
    order.bankTransfer.reviewedBy = req.admin?.username || req.admin?.email || 'admin';
    await order.save();
    const completed = await finalizePaidOrder({ order, source: 'admin' });
    res.json(buildOrderResponse(completed));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not confirm bank transfer' });
  }
};

export const rejectManualPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Paid orders cannot be rejected here' });
    order.paymentStatus = 'failed';
    order.finalizationState = 'failed';
    order.finalizationError = String(req.body?.note || 'Bank transfer rejected').trim();
    order.bankTransfer.reviewedAt = new Date();
    order.bankTransfer.reviewNote = order.finalizationError;
    order.bankTransfer.reviewedBy = req.admin?.username || req.admin?.email || 'admin';
    order.paymentEvents.push({ type: 'payment_rejected', source: 'admin', status: 'failed', message: order.finalizationError, reference: order.paymentRef });
    await order.save();
    res.json(order);
  } catch {
    res.status(500).json({ message: 'Could not reject bank transfer' });
  }
};

export const retryOrderFinalization = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus !== 'paid') return res.status(400).json({ message: 'Only paid orders can be finalized again' });
    const completed = await finalizePaidOrder({ order, source: 'admin' });
    res.json(buildOrderResponse(completed));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not finalize order' });
  }
};
