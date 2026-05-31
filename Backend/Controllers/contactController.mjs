import {
  sendContactInquiryAutoReply,
  sendContactInquiryNotification,
} from '../Services/contactMailService.mjs';

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

    return res.status(202).json({
      message: 'Your message has been sent. Please check your email for confirmation.',
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || 'We could not send your message right now. Please try again shortly.',
    });
  }
};
