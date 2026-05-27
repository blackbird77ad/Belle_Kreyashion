import axios from 'axios';
import nodemailer from 'nodemailer';
import { buildCertificatePdf } from '../Utils/certificatePdf.mjs';

let transporter = null;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getSmtpSettings = () => ({
  host: process.env.SMTP_HOST || process.env.MAIL_HOST || '',
  port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
  user: process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER || '',
  pass: process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || '',
});

const normalizeConfiguredValue = (value = '') => String(value || '').trim().replace(/^['"]|['"]$/g, '');

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
    process.env.CERTIFICATE_FROM_EMAIL,
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
      'Certificate sender email is still using a placeholder domain. ' +
      'Update CERTIFICATE_FROM_EMAIL or RESEND_FROM_EMAIL to a verified address such as "Belle Kreyashon <certificates@your-real-domain.com>".'
    );
  }

  if (!candidates.length) {
    throw new Error(
      'Certificate sender email is not configured. Set CERTIFICATE_FROM_EMAIL or RESEND_FROM_EMAIL. ' +
      'SMTP_FROM can also be used when you prefer SMTP delivery.'
    );
  }

  throw new Error(
    'Certificate sender email format is invalid. Use a plain address or the format "Belle Kreyashon <mail@verified-domain.com>".'
  );
};

const buildCertificateFilename = (record) => String(record.certificateNumber || 'certificate').replace(/[^A-Za-z0-9-_]/g, '-');

const buildCertificateEmailHtml = (record) => `
  <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
    <p>Hello ${escapeHtml(record.learnerName || 'Learner')},</p>
    <p>
      Your certificate${record.certificateTitle ? ` for <strong>${escapeHtml(record.certificateTitle)}</strong>` : ''} is ready.
    </p>
    <p>
      Your PDF certificate is attached to this email. Please download it from your recipient email
      and save a backup in your cloud storage for safekeeping.
    </p>
    <p>Thank you,<br/>Belle Kreyashon</p>
  </div>
`;

const buildCertificateEmailText = (record) => [
  `Hello ${record.learnerName || 'Learner'},`,
  '',
  `Your certificate${record.certificateTitle ? ` for ${record.certificateTitle}` : ''} is ready.`,
  'Your PDF certificate is attached to this email.',
  'Please download it from your recipient email and save a backup in your cloud storage for safekeeping.',
  '',
  'Thank you,',
  'Belle Kreyashon',
].join('\n');

const sendWithResend = async ({ record, sender, subject, html, text, pdf }) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  if (!sender?.email) {
    throw new Error('Resend sender email format is invalid');
  }

  const payload = {
    from: sender.formatted,
    to: [record.learnerEmail],
    subject,
    html,
    text,
    attachments: [
      {
        filename: `${buildCertificateFilename(record)}.pdf`,
        content: pdf.toString('base64'),
      },
    ],
  };

  const replyTo = String(process.env.RESEND_REPLY_TO || process.env.CERTIFICATE_REPLY_TO || '').trim();
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

export const sendCertificateEmail = async (record) => {
  if (!record?.learnerEmail) {
    throw new Error('Learner email is required before sending the certificate');
  }

  const sender = resolveSender();
  const html = buildCertificateEmailHtml(record);
  const text = buildCertificateEmailText(record);
  const pdf = buildCertificatePdf(record);
  const subject = `Your Belle Kreyashon certificate${record.certificateTitle ? ` - ${record.certificateTitle}` : ''}`;
  const safeNumber = buildCertificateFilename(record);

  let resendFailed = false;
  const resendResult = await sendWithResend({ record, sender, subject, html, text, pdf }).catch((error) => {
    error.message = `Resend send failed for ${sender.formatted} (${sender.domain}): ${error.response?.data?.message || error.message}`;
    if (!hasSmtpConfig()) throw error;
    resendFailed = true;
    return null;
  });
  if (resendResult) return resendResult;

  const mailer = getTransporter();

  await mailer.sendMail({
    from: sender.formatted,
    to: record.learnerEmail,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `${safeNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    provider: resendFailed ? 'smtp-fallback' : 'smtp',
    id: '',
  };
};
