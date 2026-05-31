import crypto from 'crypto';
import axios from 'axios';

const SITE_URL = 'https://bellekreyashon.com';

const trim = (value = '') => String(value || '').trim();

const normalizeUrl = (value = '') => {
  const raw = trim(value);
  if (!raw) return trim(process.env.FRONTEND_URL) || SITE_URL;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${trim(process.env.FRONTEND_URL) || SITE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const normalizeEmail = (value = '') => trim(value).toLowerCase();

const normalizePhoneDigits = (value = '') => {
  const digits = trim(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.startsWith('233') && digits.length === 12) return digits;
  return digits;
};

const splitName = (fullName = '') => {
  const parts = trim(fullName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
};

const hashValue = (value = '') => {
  const clean = trim(value);
  if (!clean) return '';
  return crypto.createHash('sha256').update(clean).digest('hex');
};

const cleanObject = (value = {}) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => {
    if (item === null || item === undefined || item === '') return false;
    if (Array.isArray(item)) return item.length > 0;
    return true;
  })
);

const parseClientIp = (value = '') => trim(String(value || '').split(',')[0]);

const buildUserData = ({ customer = {}, browserData = {}, clientIp = '', userAgent = '' }) => {
  const email = normalizeEmail(customer.email);
  const phone = normalizePhoneDigits(customer.phone);
  const externalId = trim(customer.customerId || customer.phone || customer.email);
  const { firstName, lastName } = splitName(customer.name);

  return cleanObject({
    em: email ? [hashValue(email)] : undefined,
    ph: phone ? [hashValue(phone)] : undefined,
    fn: firstName ? [hashValue(firstName.toLowerCase())] : undefined,
    ln: lastName ? [hashValue(lastName.toLowerCase())] : undefined,
    external_id: externalId ? [hashValue(externalId.toLowerCase())] : undefined,
    fbc: trim(browserData.fbc),
    fbp: trim(browserData.fbp),
    client_ip_address: parseClientIp(clientIp),
    client_user_agent: trim(userAgent),
  });
};

const buildMetaContents = (items = []) => (
  items
    .map((item) => cleanObject({
      id: trim(item.productId || item.trainingId || item.consultationId || item.slug || item.name),
      quantity: Math.max(Number(item.qty || 1) || 1, 1),
      item_price: Number(item.price || item.amount || 0) || 0,
    }))
    .filter((item) => item.id)
);

const getOrderValue = (order = {}) => (
  order.paymentPurpose === 'trial_setup'
    ? Number(order.paystackChargedAmount || 0) || 0
    : Number(order.total || 0) || 0
);

const getOrderEventName = (order = {}) => {
  if (order.paymentPurpose === 'trial_setup') return 'StartTrial';
  if (order.paymentPurpose === 'free_claim') return 'Lead';
  return 'Purchase';
};

const buildOrderCustomData = (order = {}) => {
  const contents = buildMetaContents(order.items || []);
  const value = getOrderValue(order);

  return cleanObject({
    currency: 'GHS',
    value,
    content_type: 'product',
    content_ids: contents.map((item) => item.id),
    contents,
    num_items: (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    order_id: trim(order.orderId),
  });
};

const buildBookingCustomData = (booking = {}) => {
  const title = trim(booking.trainingTitle || booking.consultationTitle || booking.bookingId);
  const entityId = trim(booking.trainingId || booking.consultationId || booking.bookingId);

  return cleanObject({
    currency: 'GHS',
    value: Number(booking.amount || 0) || 0,
    content_type: 'service',
    content_name: title,
    content_category: booking.type || 'booking',
    content_ids: entityId ? [entityId] : undefined,
    contents: entityId ? [{ id: entityId, quantity: 1, item_price: Number(booking.amount || 0) || 0 }] : undefined,
    booking_id: trim(booking.bookingId),
  });
};

export const sendMetaWebsiteEvent = async ({
  eventName,
  eventId = '',
  eventTime = Date.now(),
  eventSourceUrl = '',
  actionSource = 'website',
  customer = {},
  browserData = {},
  customData = {},
  clientIp = '',
  userAgent = '',
  testEventCode = '',
}) => {
  const pixelId = trim(process.env.META_PIXEL_ID);
  const accessToken = trim(process.env.META_ACCESS_TOKEN);
  const apiVersion = trim(process.env.META_API_VERSION) || 'v22.0';

  if (!pixelId || !accessToken || !eventName) {
    return { skipped: true };
  }

  const payload = {
    data: [
      cleanObject({
        event_name: eventName,
        event_time: Math.floor(new Date(eventTime).getTime() / 1000),
        event_id: trim(eventId),
        event_source_url: normalizeUrl(eventSourceUrl),
        action_source: actionSource,
        user_data: buildUserData({ customer, browserData, clientIp, userAgent }),
        custom_data: cleanObject(customData),
      }),
    ],
  };

  const activeTestCode = trim(testEventCode || process.env.META_TEST_EVENT_CODE);
  if (activeTestCode) payload.test_event_code = activeTestCode;

  const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events`;
  const response = await axios.post(url, payload, {
    params: { access_token: accessToken },
    timeout: 10000,
  });

  return response.data;
};

export const sendMetaOrderEvent = async (order = {}, requestContext = {}) => (
  sendMetaWebsiteEvent({
    eventName: getOrderEventName(order),
    eventId: `order-${trim(order.orderId)}-${trim(order.paymentPurpose || 'purchase')}`,
    eventSourceUrl: '/order-confirmed',
    customer: order.customer || {},
    browserData: requestContext.browserData || {},
    clientIp: requestContext.clientIp || '',
    userAgent: requestContext.userAgent || '',
    customData: buildOrderCustomData(order),
  })
);

export const sendMetaBookingEvent = async (booking = {}, requestContext = {}) => (
  sendMetaWebsiteEvent({
    eventName: 'Purchase',
    eventId: `booking-${trim(booking.bookingId)}`,
    eventSourceUrl: '/services',
    customer: booking.customer || {},
    browserData: requestContext.browserData || {},
    clientIp: requestContext.clientIp || '',
    userAgent: requestContext.userAgent || '',
    customData: buildBookingCustomData(booking),
  })
);
