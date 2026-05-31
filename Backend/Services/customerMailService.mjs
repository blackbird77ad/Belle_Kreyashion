import axios from 'axios';
import nodemailer from 'nodemailer';

let transporter = null;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

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
    process.env.CUSTOMER_FROM_EMAIL,
    process.env.RESEND_FROM_EMAIL,
    process.env.CERTIFICATE_FROM_EMAIL,
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
      'Customer sender email is still using a placeholder domain. ' +
      'Update CUSTOMER_FROM_EMAIL or RESEND_FROM_EMAIL to a verified address such as "Belle Kreyashon <hello@your-real-domain.com>".'
    );
  }

  if (!candidates.length) {
    throw new Error(
      'Customer sender email is not configured. Set CUSTOMER_FROM_EMAIL or RESEND_FROM_EMAIL. ' +
      'SMTP_FROM can also be used when you prefer SMTP delivery.'
    );
  }

  throw new Error(
    'Customer sender email format is invalid. Use a plain address or the format "Belle Kreyashon <mail@verified-domain.com>".'
  );
};

const sendWithResend = async ({ to, subject, html, text, sender }) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  const payload = {
    from: sender.formatted,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  const replyTo = String(process.env.RESEND_REPLY_TO || process.env.CUSTOMER_REPLY_TO || '').trim();
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

const sendCustomerEmail = async ({ to, subject, html, text }) => {
  const sender = resolveSender();
  let resendFailed = false;

  const resendResult = await sendWithResend({ to, subject, html, text, sender }).catch((error) => {
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
  });

  return {
    provider: resendFailed ? 'smtp-fallback' : 'smtp',
    id: '',
  };
};

const buildFrontendLink = (path = '') => {
  const base = String(process.env.FRONTEND_URL || 'https://bellekreyashon.com').trim().replace(/\/+$/, '');
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const buildButton = (label, href) => `
  <a
    href="${href}"
    style="display:inline-block;padding:12px 18px;border-radius:14px;background:#111111;color:#ffffff;text-decoration:none;font-weight:700"
  >${escapeHtml(label)}</a>
`;

export const sendCustomerWelcomeEmail = async ({ customer, verificationUrl = '' }) => {
  if (!customer?.email) return null;

  const dashboardUrl = buildFrontendLink('/account');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
      <p>Hello ${escapeHtml(customer.name || 'there')},</p>
      <p>Your Belle Kreyashon customer account is ready.</p>
      <p>
        You can now sign in anytime to track your orders, open your digital products,
        and manage your learning history from one simple dashboard.
      </p>
      <p>${buildButton('Open My Dashboard', dashboardUrl)}</p>
      ${verificationUrl ? `<p>Please also confirm your email address:</p><p>${buildButton('Confirm My Email', verificationUrl)}</p>` : ''}
      <p>Thank you,<br/>Belle Kreyashon</p>
    </div>
  `;
  const text = [
    `Hello ${customer.name || 'there'},`,
    '',
    'Your Belle Kreyashon customer account is ready.',
    'You can now sign in anytime to track your orders, open your digital products, and manage your history.',
    `Dashboard: ${dashboardUrl}`,
    verificationUrl ? `Confirm your email: ${verificationUrl}` : '',
    '',
    'Thank you,',
    'Belle Kreyashon',
  ].filter(Boolean).join('\n');

  return sendCustomerEmail({
    to: customer.email,
    subject: 'Welcome to your Belle Kreyashon account',
    html,
    text,
  });
};

export const sendCustomerVerificationEmail = async ({ customer, verificationUrl }) => {
  if (!customer?.email || !verificationUrl) return null;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
      <p>Hello ${escapeHtml(customer.name || 'there')},</p>
      <p>Please confirm your Belle Kreyashon email address to keep your account up to date.</p>
      <p>${buildButton('Confirm Email', verificationUrl)}</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Thank you,<br/>Belle Kreyashon</p>
    </div>
  `;
  const text = [
    `Hello ${customer.name || 'there'},`,
    '',
    'Please confirm your Belle Kreyashon email address:',
    verificationUrl,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'Thank you,',
    'Belle Kreyashon',
  ].join('\n');

  return sendCustomerEmail({
    to: customer.email,
    subject: 'Confirm your Belle Kreyashon email',
    html,
    text,
  });
};

export const sendCustomerPasswordResetEmail = async ({ customer, resetUrl }) => {
  if (!customer?.email || !resetUrl) return null;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
      <p>Hello ${escapeHtml(customer.name || 'there')},</p>
      <p>We received a request to reset your Belle Kreyashon password.</p>
      <p>${buildButton('Reset Password', resetUrl)}</p>
      <p>This link expires soon. If you did not request a password reset, you can ignore this email.</p>
      <p>Thank you,<br/>Belle Kreyashon</p>
    </div>
  `;
  const text = [
    `Hello ${customer.name || 'there'},`,
    '',
    'We received a request to reset your Belle Kreyashon password.',
    resetUrl,
    '',
    'This link expires soon. If you did not request a password reset, you can ignore this email.',
    '',
    'Thank you,',
    'Belle Kreyashon',
  ].join('\n');

  return sendCustomerEmail({
    to: customer.email,
    subject: 'Reset your Belle Kreyashon password',
    html,
    text,
  });
};

export const sendCustomerOrderEmail = async ({ order }) => {
  const email = String(order?.customer?.email || '').trim().toLowerCase();
  if (!email) return null;

  const dashboardUrl = buildFrontendLink('/account');
  const libraryUrl = buildFrontendLink('/digital-library');
  const hasDigitalItems = (order.items || []).some((item) => item.isDigital);
  const itemsHtml = (order.items || []).map((item) => (
    `<li>${escapeHtml(item.name || 'Item')}${item.variant ? ` (${escapeHtml(item.variant)})` : ''} x${Number(item.qty) || 0}</li>`
  )).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
      <p>Hello ${escapeHtml(order.customer?.name || 'there')},</p>
      <p>Your Belle Kreyashon order <strong>${escapeHtml(order.orderId || '')}</strong> has been received successfully.</p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total:</strong> GHS ${Number(order.total || 0).toLocaleString()}</p>
      <p>${buildButton('View My Dashboard', dashboardUrl)}</p>
      ${hasDigitalItems ? `<p>${buildButton('Open My Digital Library', libraryUrl)}</p>` : ''}
      <p>We’ll keep you updated as your order moves forward.</p>
      <p>Thank you,<br/>Belle Kreyashon</p>
    </div>
  `;
  const text = [
    `Hello ${order.customer?.name || 'there'},`,
    '',
    `Your Belle Kreyashon order ${order.orderId || ''} has been received successfully.`,
    ...(order.items || []).map((item) => `- ${item.name || 'Item'}${item.variant ? ` (${item.variant})` : ''} x${Number(item.qty) || 0}`),
    '',
    `Total: GHS ${Number(order.total || 0).toLocaleString()}`,
    `Dashboard: ${dashboardUrl}`,
    hasDigitalItems ? `Digital library: ${libraryUrl}` : '',
    '',
    'We’ll keep you updated as your order moves forward.',
    '',
    'Thank you,',
    'Belle Kreyashon',
  ].filter(Boolean).join('\n');

  return sendCustomerEmail({
    to: email,
    subject: `Order received - ${order.orderId || 'Belle Kreyashon'}`,
    html,
    text,
  });
};

export const sendCustomerBookingEmail = async ({ booking }) => {
  const email = String(booking?.customer?.email || '').trim().toLowerCase();
  if (!email) return null;

  const dashboardUrl = buildFrontendLink('/account');
  const sessionName = booking.trainingTitle || booking.consultationTitle || booking.bookingId || 'your booking';
  const typeLabel = booking.type === 'training' ? 'training booking' : 'consultation booking';

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
      <p>Hello ${escapeHtml(booking.customer?.name || 'there')},</p>
      <p>Your Belle Kreyashon ${escapeHtml(typeLabel)} is confirmed.</p>
      <p><strong>${escapeHtml(sessionName)}</strong></p>
      <p>Booking ID: <strong>${escapeHtml(booking.bookingId || '')}</strong></p>
      <p>Amount paid: <strong>GHS ${Number(booking.amount || 0).toLocaleString()}</strong></p>
      <p>${buildButton('Open My Dashboard', dashboardUrl)}</p>
      <p>Thank you,<br/>Belle Kreyashon</p>
    </div>
  `;
  const text = [
    `Hello ${booking.customer?.name || 'there'},`,
    '',
    `Your Belle Kreyashon ${typeLabel} is confirmed.`,
    sessionName,
    `Booking ID: ${booking.bookingId || ''}`,
    `Amount paid: GHS ${Number(booking.amount || 0).toLocaleString()}`,
    `Dashboard: ${dashboardUrl}`,
    '',
    'Thank you,',
    'Belle Kreyashon',
  ].join('\n');

  return sendCustomerEmail({
    to: email,
    subject: `Booking confirmed - ${booking.bookingId || 'Belle Kreyashon'}`,
    html,
    text,
  });
};
