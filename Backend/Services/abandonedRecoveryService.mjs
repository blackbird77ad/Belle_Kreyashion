import axios from 'axios';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import { sendAbandonedCartRecoveryEmail } from './customerMailService.mjs';

const DEFAULT_FRONTEND_BASE_URL = 'https://bellekreyashon.com';
const workerIntervalMs = Math.max(5, Number(process.env.ABANDONED_RECOVERY_WORKER_MINUTES) || 15) * 60 * 1000;

const buildRecoveryUrl = (cart) => {
  const base = String(process.env.SITE_URL || process.env.FRONTEND_URL || DEFAULT_FRONTEND_BASE_URL).replace(/\/+$/, '');
  return `${base}/recover-cart?token=${encodeURIComponent(cart.recoveryToken || '')}`;
};

const normalizeWhatsAppPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  return digits;
};

const sendWhatsAppRecoveryTemplate = async (cart, recoveryUrl) => {
  const accessToken = String(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '').trim();
  const templateName = String(process.env.WHATSAPP_RECOVERY_TEMPLATE_NAME || '').trim();
  const recipient = normalizeWhatsAppPhone(cart.phone);
  if (!accessToken || !phoneNumberId || !templateName || !recipient) return null;

  const apiVersion = String(process.env.WHATSAPP_CLOUD_API_VERSION || 'v22.0').trim();
  const components = [{
    type: 'body',
    parameters: [
      { type: 'text', text: cart.name || 'there' },
      { type: 'text', text: String((cart.items || []).length) },
    ],
  }];
  if (process.env.WHATSAPP_RECOVERY_TEMPLATE_URL_BUTTON === 'true') {
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: cart.recoveryToken || recoveryUrl }] });
  }

  const { data } = await axios.post(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: String(process.env.WHATSAPP_RECOVERY_TEMPLATE_LANGUAGE || 'en_US') },
        components,
      },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return data;
};

export const sendAbandonedRecovery = async (cartInput) => {
  const cart = cartInput?._id ? cartInput : await AbandonedCart.findById(cartInput);
  if (!cart || cart.status !== 'active' || !(cart.items || []).length) return null;
  const recoveryUrl = buildRecoveryUrl(cart);
  const results = await Promise.allSettled([
    sendAbandonedCartRecoveryEmail({ cart, recoveryUrl }),
    sendWhatsAppRecoveryTemplate(cart, recoveryUrl),
  ]);
  const delivered = results.some((result) => result.status === 'fulfilled' && result.value);
  if (!delivered) throw new Error('No recovery email or WhatsApp channel is configured for this cart');
  cart.reminderCount += 1;
  cart.lastReminderAt = new Date();
  cart.nextReminderAt = cart.reminderCount >= 2 ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);
  await cart.save();
  return { cart, recoveryUrl, results };
};

const runRecoveryBatch = async () => {
  if (String(process.env.ABANDONED_RECOVERY_ENABLED || '').toLowerCase() !== 'true') return;
  const carts = await AbandonedCart.find({
    status: 'active',
    reminderCount: { $lt: 2 },
    nextReminderAt: { $ne: null, $lte: new Date() },
  }).sort({ nextReminderAt: 1 }).limit(25);
  for (const cart of carts) {
    await sendAbandonedRecovery(cart).catch((error) => console.error('Abandoned cart recovery failed:', error.message));
  }
};

export const startAbandonedCartRecoveryWorker = () => {
  if (String(process.env.ABANDONED_RECOVERY_ENABLED || '').toLowerCase() !== 'true') return;
  setTimeout(() => runRecoveryBatch().catch((error) => console.error('Recovery worker failed:', error.message)), 15_000);
  const timer = setInterval(() => runRecoveryBatch().catch((error) => console.error('Recovery worker failed:', error.message)), workerIntervalMs);
  timer.unref?.();
};
