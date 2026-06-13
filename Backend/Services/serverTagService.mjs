import crypto from 'crypto';
import axios from 'axios';

const trim = (value = '') => String(value || '').trim();

const hashValue = (value = '') => {
  const normalized = trim(value).toLowerCase();
  return normalized ? crypto.createHash('sha256').update(normalized).digest('hex') : '';
};

const normalizePhone = (value = '') => {
  const digits = trim(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const cleanObject = (value = {}) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => {
    if (item === null || item === undefined || item === '') return false;
    if (Array.isArray(item)) return item.length > 0;
    return true;
  })
);

const buildItems = (items = []) => items.map((item) => cleanObject({
  item_id: trim(item.productId || item.trainingId || item.consultationId || item.slug || item.name),
  item_name: trim(item.name || item.trainingTitle || item.consultationTitle),
  item_category: trim(item.category || (item.isDigital ? 'Digital Products' : '')),
  price: Number(item.price || item.amount || 0) || 0,
  quantity: Math.max(Number(item.qty || item.quantity || 1) || 1, 1),
}));

export const sendServerTagEvent = async ({
  eventName,
  eventId = '',
  customer = {},
  items = [],
  value = 0,
  currency = 'GHS',
  transactionId = '',
  sourceAttribution = {},
  pageUrl = '',
  extra = {},
} = {}) => {
  const endpoint = trim(process.env.SERVER_GTM_EVENT_ENDPOINT);
  if (!endpoint || !eventName) return { skipped: true };

  const payload = cleanObject({
    event_name: eventName,
    event_id: trim(eventId),
    event_time: new Date().toISOString(),
    page_location: trim(pageUrl),
    transaction_id: trim(transactionId),
    currency,
    value: Number(value) || 0,
    items: buildItems(items),
    user_data: cleanObject({
      sha256_email_address: customer.email ? hashValue(customer.email) : '',
      sha256_phone_number: customer.phone ? hashValue(normalizePhone(customer.phone)) : '',
      sha256_external_id: customer.customerId ? hashValue(customer.customerId) : '',
    }),
    attribution: cleanObject({
      session_id: sourceAttribution.sessionId,
      source: sourceAttribution.utmSource,
      medium: sourceAttribution.utmMedium,
      campaign: sourceAttribution.utmCampaign,
      term: sourceAttribution.utmTerm,
      content: sourceAttribution.utmContent,
      gclid: sourceAttribution.gclid,
      fbclid: sourceAttribution.fbclid,
      ttclid: sourceAttribution.ttclid,
      msclkid: sourceAttribution.msclkid,
      landing_page: sourceAttribution.landingPage,
      referrer: sourceAttribution.referrer,
    }),
    ...extra,
  });

  const secret = trim(process.env.SERVER_GTM_AUTH_TOKEN);
  const signature = secret
    ? crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
    : '';

  const response = await axios.post(endpoint, payload, {
    headers: cleanObject({
      'Content-Type': 'application/json',
      'x-bk-signature': signature,
    }),
    timeout: 10000,
  });

  return response.data;
};

export const sendServerOrderEvent = (order = {}) => {
  const purpose = order.paymentPurpose || 'purchase';
  const eventName = purpose === 'trial_setup' ? 'start_trial' : purpose === 'free_claim' ? 'generate_lead' : 'purchase';
  const value = purpose === 'trial_setup' ? Number(order.paystackChargedAmount || 0) : Number(order.total || 0);
  return sendServerTagEvent({
    eventName,
    eventId: `order-${order.orderId}-${purpose}`,
    customer: order.customer || {},
    items: order.items || [],
    value,
    transactionId: order.orderId,
    sourceAttribution: order.sourceAttribution || {},
    pageUrl: '/order-confirmed',
    extra: { shipping: Number(order.deliveryFee || 0) || 0 },
  });
};

export const sendServerBookingEvent = (booking = {}) => sendServerTagEvent({
  eventName: 'purchase',
  eventId: `booking-${booking.bookingId}`,
  customer: booking.customer || {},
  items: [{
    productId: booking.trainingId || booking.consultationId || booking.bookingId,
    name: booking.trainingTitle || booking.consultationTitle || booking.bookingId,
    category: booking.type === 'training' ? 'Training' : 'Consultation',
    price: booking.amount,
    qty: 1,
  }],
  value: Number(booking.amount || 0) || 0,
  transactionId: booking.bookingId,
  sourceAttribution: booking.sourceAttribution || {},
  pageUrl: '/services',
});

export const sendServerLeadEvent = ({ eventId = '', customer = {}, sourceAttribution = {}, formName = '', leadType = '' } = {}) => (
  sendServerTagEvent({
    eventName: 'generate_lead',
    eventId,
    customer,
    sourceAttribution,
    pageUrl: '/contact',
    extra: { form_name: formName, lead_type: leadType },
  })
);
