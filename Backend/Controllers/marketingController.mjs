import { sendMetaWebsiteEvent } from '../Services/metaConversionsService.mjs';

const ALLOWED_EVENTS = new Set([
  'InitiateCheckout',
  'Contact',
  'Lead',
  'StartTrial',
]);

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
