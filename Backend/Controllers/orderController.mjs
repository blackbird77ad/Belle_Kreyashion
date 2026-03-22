import Order from '../Models/Order.mjs';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import axios from 'axios';

const WHATSAPP = process.env.WHATSAPP_NUMBER;
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

export const saveAbandonedCart = async (req, res) => {
  try {
    const { name, phone, items } = req.body;
    await AbandonedCart.findOneAndUpdate(
      { phone },
      { name, phone, items, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Cart saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAbandonedCarts = async (req, res) => {
  try {
    const carts = await AbandonedCart.find().sort({ updatedAt: -1 });
    res.json(carts);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const verifyAndCreateOrder = async (req, res) => {
  try {
    const { transaction_id, orderData } = req.body;

    // Verify with Flutterwave
    const verify = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (verify.data.data.status !== 'successful') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    // Create order
    const order = await Order.create({
      ...orderData,
      paymentRef: transaction_id,
      paymentStatus: 'paid',
    });

    // Remove from abandoned cart
    await AbandonedCart.findOneAndDelete({ phone: orderData.customer.phone });

    // Build WhatsApp message
    const items = order.items.map(i =>
      `  - ${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.qty} @ GHS ${i.price}`
    ).join('\n');

    const msg = encodeURIComponent(
`🛍️ NEW ORDER — Belle Kreyashon
━━━━━━━━━━━━━━━━━━━
Order ID: ${order.orderId}
Customer: ${order.customer.name}
Phone: ${order.customer.phone}
Type: ${order.orderType.toUpperCase()}

ITEMS:
${items}

Subtotal: GHS ${order.subtotal}
Delivery (${order.deliveryZone}): GHS ${order.deliveryFee}
TOTAL: GHS ${order.total}
━━━━━━━━━━━━━━━━━━━
Payment: CONFIRMED ✅
Ref: ${transaction_id}`
    );

    res.json({
      order,
      whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
      callUrl: `tel:+${WHATSAPP}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
