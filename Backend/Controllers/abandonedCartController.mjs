import crypto from 'node:crypto';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import { sendAbandonedRecovery } from '../Services/abandonedRecoveryService.mjs';

const createRecoveryToken = () => crypto.randomBytes(24).toString('hex');
const hashText = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex');

export const saveAbandonedCart = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const items = Array.isArray(req.body?.items) ? req.body.items.filter((item) => item?.productId) : [];
    if (!items.length || (!phone && !email)) return res.status(400).json({ message: 'Cart items and customer contact are required' });
    let cart = await AbandonedCart.findOne({
      ...(email ? { email } : { phone }),
      $or: [{ status: 'active' }, { status: { $exists: false } }, { status: '' }],
    });
    const recoveryToken = cart?.recoveryToken || createRecoveryToken();
    const reminderDelayMinutes = Math.max(15, Number(process.env.ABANDONED_RECOVERY_DELAY_MINUTES) || 60);
    const payload = {
      name,
      phone,
      email,
      items,
      sourceAttribution: req.body?.sourceAttribution || null,
      recoveryToken,
      recoveryTokenHash: hashText(recoveryToken),
      updatedAt: new Date(),
      followedUp: false,
      status: 'active',
      nextReminderAt: cart?.reminderCount ? cart.nextReminderAt : new Date(Date.now() + reminderDelayMinutes * 60 * 1000),
    };
    cart = cart
      ? await AbandonedCart.findByIdAndUpdate(cart._id, payload, { new: true })
      : await AbandonedCart.create(payload);
    res.json({ message: 'Saved', id: cart._id });
  } catch (error) { res.status(500).json({ message: error.message || 'Could not save cart' }); }
};

export const getAbandonedCarts = async (_, res) => {
  try { res.json(await AbandonedCart.find().sort({ updatedAt: -1 })); }
  catch { res.status(500).json({ message: 'Could not load abandoned carts' }); }
};

export const toggleFollowUp = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    cart.followedUp = !cart.followedUp;
    await cart.save();
    res.json(cart);
  } catch { res.status(500).json({ message: 'Could not update cart' }); }
};

export const sendRecoveryNow = async (req, res) => {
  try {
    const result = await sendAbandonedRecovery(req.params.id);
    if (!result) return res.status(404).json({ message: 'Active cart not found' });
    res.json({ message: 'Recovery message sent', cart: result.cart });
  } catch (error) { res.status(400).json({ message: error.message || 'Could not send recovery message' }); }
};

export const recoverCart = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const cart = await AbandonedCart.findOne({ recoveryTokenHash: hashText(token), status: { $in: ['active', 'recovered'] } });
    if (!cart) return res.status(404).json({ message: 'This recovery link is invalid or has expired' });
    cart.status = 'recovered';
    cart.recoveredAt = new Date();
    await cart.save();
    res.json({ items: cart.items, customer: { name: cart.name, phone: cart.phone, email: cart.email }, sourceAttribution: cart.sourceAttribution });
  } catch { res.status(500).json({ message: 'Could not restore cart' }); }
};
