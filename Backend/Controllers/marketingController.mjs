import { sendMetaWebsiteEvent } from '../Services/metaConversionsService.mjs';
import MarketingActivity from '../Models/MarketingActivity.mjs';
import Booking from '../Models/Booking.mjs';
import Order from '../Models/Order.mjs';

const ALLOWED_EVENTS = new Set([
  'InitiateCheckout',
  'Contact',
  'Lead',
  'StartTrial',
]);

const ALLOWED_ACTIVITY_EVENTS = new Set([
  'page_view',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'contact_click',
  'form_submission',
]);

const cleanText = (value, maxLength = 300) => String(value || '').trim().slice(0, maxLength);

const cleanAttribution = (source = {}) => ({
  sourcePage: cleanText(source.sourcePage, 1000),
  sourcePath: cleanText(source.sourcePath, 500),
  sourceQuery: cleanText(source.sourceQuery, 1000),
  utmSource: cleanText(source.utmSource, 200),
  utmMedium: cleanText(source.utmMedium, 200),
  utmCampaign: cleanText(source.utmCampaign, 300),
  utmTerm: cleanText(source.utmTerm, 300),
  utmContent: cleanText(source.utmContent, 300),
  gclid: cleanText(source.gclid, 500),
  fbclid: cleanText(source.fbclid, 500),
  ttclid: cleanText(source.ttclid, 500),
  msclkid: cleanText(source.msclkid, 500),
  landingPage: cleanText(source.landingPage, 1000),
  referrer: cleanText(source.referrer, 1000),
  sessionId: cleanText(source.sessionId, 200),
  firstSeenAt: cleanText(source.firstSeenAt, 100),
  lastSeenAt: cleanText(source.lastSeenAt, 100),
});

const getClientIp = (req) => (
  req.headers['x-forwarded-for']
  || req.socket?.remoteAddress
  || ''
);

export const captureMetaBrowserEvent = async (req, res) => {
  try {
    const {
      eventName = '',
      eventId = '',
      eventSourceUrl = '',
      actionSource = 'website',
      customer = {},
      browserData = {},
      customData = {},
      testEventCode = '',
    } = req.body || {};

    if (!ALLOWED_EVENTS.has(eventName)) {
      return res.status(400).json({ message: 'Unsupported marketing event' });
    }

    await sendMetaWebsiteEvent({
      eventName,
      eventId,
      eventSourceUrl,
      actionSource,
      customer,
      browserData,
      customData,
      testEventCode,
      clientIp: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    });

    return res.status(202).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Marketing event failed' });
  }
};

export const captureMarketingActivity = async (req, res) => {
  try {
    const {
      eventId = '',
      eventType = '',
      sessionId = '',
      pagePath = '',
      pageTitle = '',
      product = null,
      items = [],
      itemCount = 0,
      quantity = 0,
      value = 0,
      currency = 'GHS',
      channel = '',
      sourceAttribution = {},
    } = req.body || {};

    if (!ALLOWED_ACTIVITY_EVENTS.has(eventType)) {
      return res.status(400).json({ message: 'Unsupported activity event' });
    }
    if (!cleanText(eventId, 200) || !cleanText(sessionId, 200)) {
      return res.status(400).json({ message: 'Event and session IDs are required' });
    }

    await MarketingActivity.create({
      eventId: cleanText(eventId, 200),
      eventType,
      sessionId: cleanText(sessionId, 200),
      pagePath: cleanText(pagePath, 1000),
      pageTitle: cleanText(pageTitle, 500),
      product: product ? {
        id: cleanText(product.id, 200),
        name: cleanText(product.name, 500),
        category: cleanText(product.category, 300),
        isDigital: Boolean(product.isDigital),
        price: Math.min(Math.max(0, Number(product.price) || 0), 1_000_000_000),
        quantity: Math.max(1, Math.min(Number(product.quantity) || 1, 1000)),
      } : null,
      items: (Array.isArray(items) ? items : []).slice(0, 100).map((item) => ({
        id: cleanText(item.id || item.item_id, 200),
        name: cleanText(item.name || item.item_name, 500),
        category: cleanText(item.category || item.item_category, 300),
        isDigital: Boolean(item.isDigital),
        price: Math.min(Math.max(0, Number(item.price) || 0), 1_000_000_000),
        quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 1000)),
      })),
      itemCount: Math.max(0, Math.min(Number(itemCount) || 0, 1000)),
      quantity: Math.max(0, Math.min(Number(quantity) || 0, 1000)),
      value: Math.min(Math.max(0, Number(value) || 0), 1_000_000_000),
      currency: cleanText(currency, 10) || 'GHS',
      channel: cleanText(channel, 100),
      sourceAttribution: cleanAttribution(sourceAttribution),
    });

    return res.status(202).json({ ok: true });
  } catch (err) {
    if (err?.code === 11000) return res.status(202).json({ ok: true, duplicate: true });
    return res.status(500).json({ message: err.message || 'Activity capture failed' });
  }
};

const hasEnv = (name) => Boolean(String(process.env[name] || '').trim());

const maskIdentifier = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.length <= 6) return `${clean.slice(0, 2)}...`;
  return `${clean.slice(0, 4)}...${clean.slice(-3)}`;
};

const getEndpointHostname = (value = '') => {
  try {
    return new URL(value).hostname;
  } catch {
    return 'configured endpoint';
  }
};

export const getMarketingAdminStatus = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activityGroups, orderCount, bookingCount, latestOrder, latestBooking] = await Promise.all([
      MarketingActivity.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            lastReceivedAt: { $max: '$createdAt' },
          },
        },
      ]),
      Order.countDocuments({ paymentStatus: 'paid', status: { $ne: 'cancelled' }, createdAt: { $gte: since } }),
      Booking.countDocuments({ paymentStatus: 'paid', createdAt: { $gte: since } }),
      Order.findOne({ paymentStatus: 'paid', status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).select('createdAt').lean(),
      Booking.findOne({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);
    const activityMap = new Map(activityGroups.map((item) => [item._id, item]));
    const eventTypes = [
      ['page_view', 'PageView'],
      ['view_item', 'ViewContent'],
      ['add_to_cart', 'AddToCart'],
      ['begin_checkout', 'InitiateCheckout'],
      ['contact_click', 'Lead / contact click'],
      ['form_submission', 'Form submission'],
      ['purchase', 'Purchase'],
    ];

    const googleAdsRequired = [
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_REFRESH_TOKEN',
      'GOOGLE_ADS_CUSTOMER_ID',
      'GOOGLE_ADS_CONVERSION_ACTION',
    ];
    const missingGoogleAds = googleAdsRequired.filter((name) => !hasEnv(name));
    const serverGtmEndpoint = String(process.env.SERVER_GTM_EVENT_ENDPOINT || '').trim();

    res.json({
      generatedAt: new Date().toISOString(),
      serverIntegrations: [
        {
          key: 'meta-capi',
          label: 'Meta Conversions API',
          configured: hasEnv('META_PIXEL_ID') && hasEnv('META_ACCESS_TOKEN'),
          detail: hasEnv('META_PIXEL_ID')
            ? `Pixel ${maskIdentifier(process.env.META_PIXEL_ID)}`
            : 'Add META_PIXEL_ID and META_ACCESS_TOKEN',
        },
        {
          key: 'server-gtm',
          label: 'Server-side GTM endpoint',
          configured: Boolean(serverGtmEndpoint),
          detail: serverGtmEndpoint
            ? `Sending signed ecommerce events to ${getEndpointHostname(serverGtmEndpoint)}`
            : 'Add SERVER_GTM_EVENT_ENDPOINT after deploying a server container',
        },
        {
          key: 'google-ads-api',
          label: 'Google Ads offline conversion readiness',
          configured: false,
          detail: missingGoogleAds.length === 0
            ? 'Credentials detected; route new uploads through Data Manager or the server-GTM connection'
            : `${missingGoogleAds.length} credential${missingGoogleAds.length === 1 ? '' : 's'} missing; server GTM is the recommended path`,
        },
      ],
      eventHealth: eventTypes.map(([key, label]) => {
        if (key === 'purchase') {
          const latestPurchaseAt = [latestOrder?.createdAt, latestBooking?.createdAt]
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0] || null;
          return {
            key,
            label,
            count7d: orderCount + bookingCount,
            lastReceivedAt: latestPurchaseAt,
          };
        }
        return {
          key,
          label,
          count7d: activityMap.get(key)?.count || 0,
          lastReceivedAt: activityMap.get(key)?.lastReceivedAt || null,
        };
      }),
      privacy: {
        anonymousActivityOnly: true,
        serverUserDataHashed: true,
        retentionDays: 400,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load marketing setup status' });
  }
};
