import {
  sendContactInquiryAutoReply,
  sendContactInquiryNotification,
} from '../Services/contactMailService.mjs';
import { sendMetaWebsiteEvent } from '../Services/metaConversionsService.mjs';
import { sendServerLeadEvent } from '../Services/serverTagService.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INQUIRY_TYPE_LABELS = {
  general: 'General Inquiry',
  order: 'Order Help',
  digital: 'Digital Product Help',
  training: 'Training or Consultation',
  partnership: 'Partnership or Brand Feature',
  sourcing: 'Importation or Sourcing Support',
};

const PREFERRED_REPLY_LABELS = {
  email: 'Email',
  phone: 'Phone Call',
  whatsapp: 'WhatsApp',
  any: 'Any Available Method',
};

const normalizeText = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeMultilineText = (value = '') => String(value || '').replace(/\r/g, '').trim();
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

export const submitContactInquiry = async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeText(req.body?.phone);
    const inquiryType = normalizeText(req.body?.inquiryType || 'general').toLowerCase();
    const preferredReply = normalizeText(req.body?.preferredReply || 'email').toLowerCase();
    const subject = normalizeText(req.body?.subject);
    const message = normalizeMultilineText(req.body?.message);
    const marketing = req.body?.marketing || {};

    if (!name) return res.status(400).json({ message: 'Please enter your name.' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (!message || message.length < 10) return res.status(400).json({ message: 'Please share a little more detail in your message.' });

    const inquiryPayload = {
      name,
      email,
      phone,
      inquiryType,
      inquiryTypeLabel: INQUIRY_TYPE_LABELS[inquiryType] || 'General Inquiry',
      preferredReply,
      preferredReplyLabel: PREFERRED_REPLY_LABELS[preferredReply] || 'Email',
      subject,
      message,
      submittedAt: new Date(),
    };

    await sendContactInquiryNotification(inquiryPayload);

    try {
      await sendContactInquiryAutoReply(inquiryPayload);
    } catch {
      // The main inquiry already reached the team. Do not fail the customer request because of an auto-reply issue.
    }

    if (marketing.consent === true) {
      const eventId = normalizeText(marketing.eventId || `contact-form-${Date.now()}`);
      const customer = { name, email, phone };
      const sourceAttribution = marketing.sourceAttribution || {};
      const browserData = marketing.browserData || {};

      sendMetaWebsiteEvent({
        eventName: 'Lead',
        eventId,
        eventSourceUrl: '/contact',
        customer,
        browserData,
        clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.get('user-agent') || '',
        customData: {
          content_name: 'Contact inquiry form',
          content_category: inquiryType,
          content_type: 'lead',
        },
      }).catch((trackingErr) => {
        console.error('Meta contact form tracking error:', trackingErr.message);
      });

      sendServerLeadEvent({
        eventId,
        customer,
        sourceAttribution,
        formName: 'contact_inquiry',
        leadType: inquiryType,
      }).catch((trackingErr) => {
        console.error('Server tag contact form tracking error:', trackingErr.message);
      });
    }

    return res.status(202).json({
      message: 'Your message has been sent. Please check your email for confirmation.',
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || 'We could not send your message right now. Please try again shortly.',
    });
  }
};
