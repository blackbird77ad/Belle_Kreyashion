import axios from 'axios';
import nodemailer from 'nodemailer';
import { buildEmailLayout, buildEmailMetaTable, buildEmailNote, buildEmailText, escapeHtml } from './emailTemplateService.mjs';

let transporter = null;

const normalizeConfiguredValue = (value = '') => String(value || '').trim().replace(/^['"]|['"]$/g, '');
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const extractEmailAddress = (value = '') => {
  const input = normalizeConfiguredValue(value);
  const bracketMatch = input.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (bracketMatch) return bracketMatch[1].trim().toLowerCase();

  const plainMatch = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plainMatch ? plainMatch[0].trim().toLowerCase() : '';
};

const extractEmailDomain = (value = '') => {
  const email = extractEmailAddress(value);
  return email.split('@')[1] || '';
};

const usesPlaceholderDomain = (value = '') => {
  const domain = extractEmailDomain(value);
  return ['yourdomain.com', 'example.com', 'example.org', 'example.net', 'localhost'].includes(domain);
};

const getSmtpSettings = () => ({
  host: process.env.SMTP_HOST || process.env.MAIL_HOST || '',
  port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
  user: process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER || '',
  pass: process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || '',
});

const hasSmtpConfig = () => {
  const { host, user, pass } = getSmtpSettings();
  return !!(host && user && pass);
};

const getTransporter = () => {
  if (transporter) return transporter;

  const { host, port, user, pass } = getSmtpSettings();

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP settings are incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS. ' +
      'You can also use MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS if that is how your hosting panel labels them.'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  });

  return transporter;
};

const resolveSender = () => {
  const candidates = [
    process.env.CONTACT_FROM_EMAIL,
    process.env.CUSTOMER_FROM_EMAIL,
    process.env.RESEND_FROM_EMAIL,
    process.env.SMTP_FROM,
    process.env.MAIL_FROM,
    process.env.SMTP_USER,
    process.env.MAIL_USER,
    process.env.EMAIL_USER,
  ]
    .map(normalizeConfiguredValue)
    .filter(Boolean);

  const sender = candidates.find((value) => extractEmailAddress(value) && !usesPlaceholderDomain(value)) || '';
  if (sender) {
    return {
      formatted: sender,
      email: extractEmailAddress(sender),
      domain: extractEmailDomain(sender),
    };
  }

  if (candidates.some((value) => usesPlaceholderDomain(value))) {
    throw new Error(
      'Contact sender email is still using a placeholder domain. ' +
      'Update CONTACT_FROM_EMAIL or RESEND_FROM_EMAIL to a verified address such as "Belle Kreyashon <hello@your-real-domain.com>".'
    );
  }

  if (!candidates.length) {
    throw new Error(
      'Contact sender email is not configured. Set CONTACT_FROM_EMAIL or RESEND_FROM_EMAIL. ' +
      'SMTP_FROM can also be used when you prefer SMTP delivery.'
    );
  }

  throw new Error(
    'Contact sender email format is invalid. Use a plain address or the format "Belle Kreyashon <mail@verified-domain.com>".'
  );
};

const resolveRecipient = () => {
  const candidates = [
    process.env.CONTACT_TO_EMAIL,
    process.env.CONTACT_REPLY_TO,
    process.env.CUSTOMER_REPLY_TO,
    process.env.RESEND_REPLY_TO,
    process.env.SMTP_USER,
    process.env.MAIL_USER,
    process.env.EMAIL_USER,
  ]
    .map(normalizeConfiguredValue)
    .filter(Boolean);

  const recipient = candidates.find((value) => extractEmailAddress(value) && !usesPlaceholderDomain(value)) || '';
  if (recipient) {
    return {
      formatted: recipient,
      email: extractEmailAddress(recipient),
    };
  }

  if (candidates.some((value) => usesPlaceholderDomain(value))) {
    throw new Error(
      'Contact recipient email is still using a placeholder domain. ' +
      'Update CONTACT_TO_EMAIL to a real inbox address where you want inquiries delivered.'
    );
  }

  throw new Error(
    'Contact recipient email is not configured. Set CONTACT_TO_EMAIL or CONTACT_REPLY_TO in Backend/.env.'
  );
};

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const formatSubmittedAt = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

const formatReplyTo = (name = '', email = '') => {
  const cleanName = String(name || '').replace(/[<>"]/g, '').trim();
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return '';
  return cleanName ? `${cleanName} <${cleanEmail}>` : cleanEmail;
};

const formatMessageHtml = (message = '') => escapeHtml(message).replace(/\n/g, '<br/>');

const buildInquiryHtml = (inquiry) => buildEmailLayout({
  previewText: `New ${inquiry.inquiryTypeLabel.toLowerCase()} from ${inquiry.name}.`,
  eyebrow: 'New Contact Inquiry',
  title: inquiry.subject || `New ${inquiry.inquiryTypeLabel}`,
  greetingHtml: `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
      A new inquiry has been sent from the Belle Kreyashon contact page.
    </p>
  `,
  bodyHtml: `
    <p style="margin:0 0 12px;color:#111111;font-size:16px;line-height:1.75;font-weight:700;">
      Message
    </p>
    <div style="margin:0;color:#374151;font-size:15px;line-height:1.8;">
      ${formatMessageHtml(inquiry.message)}
    </div>
  `,
  metaHtml: buildEmailMetaTable([
    { label: 'Name', value: inquiry.name },
    { label: 'Email', value: inquiry.email },
    { label: 'Phone', value: inquiry.phone || 'Not provided' },
    { label: 'Inquiry Type', value: inquiry.inquiryTypeLabel },
    { label: 'Reply Preference', value: inquiry.preferredReplyLabel },
    { label: 'Submitted', value: inquiry.submittedAtLabel },
  ]),
  noteHtml: buildEmailNote('Reply directly to this email to answer the customer using their submitted email address.'),
  footerText: 'Belle Kreyashon contact form notification.',
});

const buildInquiryText = (inquiry) => buildEmailText({
  greeting: 'A new contact inquiry has been sent from the Belle Kreyashon contact page.',
  lines: [
    `Subject: ${inquiry.subject || `New ${inquiry.inquiryTypeLabel}`}`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone || 'Not provided'}`,
    `Inquiry Type: ${inquiry.inquiryTypeLabel}`,
    `Reply Preference: ${inquiry.preferredReplyLabel}`,
    `Submitted: ${inquiry.submittedAtLabel}`,
    '',
    inquiry.message,
  ],
  actions: [],
  closing: 'Belle Kreyashon',
});

const buildAutoReplyHtml = (inquiry) => buildEmailLayout({
  previewText: 'We received your message and will reply soon.',
  eyebrow: 'We Received Your Message',
  title: 'Thanks for contacting Belle Kreyashon',
  greetingHtml: `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
      Hello ${escapeHtml(inquiry.name)},
    </p>
  `,
  bodyHtml: `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
      We have received your ${escapeHtml(inquiry.inquiryTypeLabel.toLowerCase())} and our team will get back to you soon.
    </p>
    <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">
      If your request is urgent, you can also reply to this email or reach us through the contact options on the website.
    </p>
  `,
  metaHtml: buildEmailMetaTable([
    { label: 'Subject', value: inquiry.subject || `New ${inquiry.inquiryTypeLabel}` },
    { label: 'Reply Preference', value: inquiry.preferredReplyLabel },
    { label: 'Submitted', value: inquiry.submittedAtLabel },
  ]),
  noteHtml: buildEmailNote('Keep this email for your records. We will use the contact details you submitted when we reply.'),
});

const buildAutoReplyText = (inquiry) => buildEmailText({
  greeting: `Hello ${inquiry.name},`,
  lines: [
    `We have received your ${inquiry.inquiryTypeLabel.toLowerCase()} and our team will get back to you soon.`,
    'If your request is urgent, you can also reply to this email or use the contact options on the website.',
    `Subject: ${inquiry.subject || `New ${inquiry.inquiryTypeLabel}`}`,
    `Reply preference: ${inquiry.preferredReplyLabel}`,
    `Submitted: ${inquiry.submittedAtLabel}`,
  ],
});

const sendWithResend = async ({ to, subject, html, text, sender, replyTo = '' }) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  const payload = {
    from: sender.formatted,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  if (replyTo) payload.reply_to = replyTo;

  const { data } = await axios.post('https://api.resend.com/emails', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    provider: 'resend',
    id: data?.id || '',
  };
};

const sendMail = async ({ to, subject, html, text, replyTo = '' }) => {
  const sender = resolveSender();
  let resendFailed = false;

  const resendResult = await sendWithResend({ to, subject, html, text, sender, replyTo }).catch((error) => {
    error.message = `Resend send failed for ${sender.formatted} (${sender.domain}): ${error.response?.data?.message || error.message}`;
    if (!hasSmtpConfig()) throw error;
    resendFailed = true;
    return null;
  });

  if (resendResult) return resendResult;

  const mailer = getTransporter();
  await mailer.sendMail({
    from: sender.formatted,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  return {
    provider: resendFailed ? 'smtp-fallback' : 'smtp',
    id: '',
  };
};

const buildInquiryPayload = (payload = {}) => {
  const inquiry = {
    name: String(payload.name || '').trim(),
    email: normalizeEmail(payload.email),
    phone: String(payload.phone || '').trim(),
    inquiryType: String(payload.inquiryType || 'general').trim(),
    inquiryTypeLabel: String(payload.inquiryTypeLabel || 'General Inquiry').trim(),
    preferredReply: String(payload.preferredReply || 'email').trim(),
    preferredReplyLabel: String(payload.preferredReplyLabel || 'Email').trim(),
    subject: String(payload.subject || '').trim(),
    message: String(payload.message || '').trim(),
    submittedAtLabel: formatSubmittedAt(payload.submittedAt || new Date()),
  };

  if (!inquiry.name || !inquiry.email || !inquiry.message || !isValidEmail(inquiry.email)) {
    throw new Error('Inquiry payload is incomplete');
  }

  return inquiry;
};

export const sendContactInquiryNotification = async (payload = {}) => {
  const inquiry = buildInquiryPayload(payload);
  const recipient = resolveRecipient();
  const subject = inquiry.subject || `New ${inquiry.inquiryTypeLabel} - ${inquiry.name}`;
  const replyTo = formatReplyTo(inquiry.name, inquiry.email);

  return sendMail({
    to: recipient.formatted,
    subject,
    html: buildInquiryHtml(inquiry),
    text: buildInquiryText(inquiry),
    replyTo,
  });
};

export const sendContactInquiryAutoReply = async (payload = {}) => {
  const inquiry = buildInquiryPayload(payload);
  if (!inquiry.email) return null;

  const recipient = resolveRecipient();

  return sendMail({
    to: inquiry.email,
    subject: `We received your message - Belle Kreyashon`,
    html: buildAutoReplyHtml(inquiry),
    text: buildAutoReplyText(inquiry),
    replyTo: recipient.formatted,
  });
};
