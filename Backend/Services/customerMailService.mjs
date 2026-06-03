import axios from 'axios';
import nodemailer from 'nodemailer';
import {
  buildEmailLayout,
  buildEmailList,
  buildEmailMetaTable,
  buildEmailNote,
  buildEmailText,
  escapeHtml,
} from './emailTemplateService.mjs';

let transporter = null;

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

const toTitleCase = (value = '') => {
  const input = String(value || '').trim();
  if (!input) return '';

  return input
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const sendCustomerWelcomeEmail = async ({ customer, verificationUrl = '' }) => {
  if (!customer?.email) return null;

  const dashboardUrl = buildFrontendLink('/track');
  const actions = [
    { label: 'Open My Dashboard', href: dashboardUrl, tone: 'primary' },
    ...(verificationUrl ? [{ label: 'Confirm My Email', href: verificationUrl, tone: 'secondary' }] : []),
  ];

  const html = buildEmailLayout({
    previewText: 'Your Belle Kreyashon customer account is ready.',
    eyebrow: 'Customer Account',
    title: 'Welcome to Belle Kreyashon',
    greetingHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Hello ${escapeHtml(customer.name || 'there')},
      </p>
    `,
    bodyHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Your Belle Kreyashon customer account is ready.
      </p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">
        You can now sign in anytime to track orders, manage digital products, and keep your customer history in one place.
      </p>
    `,
    actions,
    noteHtml: verificationUrl
      ? buildEmailNote('Please confirm your email so you can receive password resets, order updates, and support messages without interruption.')
      : '',
  });

  const text = buildEmailText({
    greeting: `Hello ${customer.name || 'there'},`,
    lines: [
      'Your Belle Kreyashon customer account is ready.',
      'You can now sign in anytime to track orders, manage digital products, and keep your customer history in one place.',
    ],
    actions,
  });

  return sendCustomerEmail({
    to: customer.email,
    subject: 'Welcome to your Belle Kreyashon account',
    html,
    text,
  });
};

export const sendCustomerVerificationEmail = async ({ customer, verificationUrl }) => {
  if (!customer?.email || !verificationUrl) return null;

  const actions = [{ label: 'Confirm Email', href: verificationUrl, tone: 'primary' }];

  const html = buildEmailLayout({
    previewText: 'Confirm your Belle Kreyashon email address.',
    eyebrow: 'Email Confirmation',
    title: 'Confirm your email address',
    greetingHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Hello ${escapeHtml(customer.name || 'there')},
      </p>
    `,
    bodyHtml: `
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">
        Please confirm your Belle Kreyashon email address to keep your account up to date.
      </p>
    `,
    actions,
    noteHtml: buildEmailNote('If you did not request this, you can ignore this email.'),
  });

  const text = buildEmailText({
    greeting: `Hello ${customer.name || 'there'},`,
    lines: [
      'Please confirm your Belle Kreyashon email address to keep your account up to date.',
      'If you did not request this, you can ignore this email.',
    ],
    actions,
  });

  return sendCustomerEmail({
    to: customer.email,
    subject: 'Confirm your Belle Kreyashon email',
    html,
    text,
  });
};

export const sendCustomerPasswordResetEmail = async ({ customer, resetUrl }) => {
  if (!customer?.email || !resetUrl) return null;

  const actions = [{ label: 'Reset Password', href: resetUrl, tone: 'primary' }];

  const html = buildEmailLayout({
    previewText: 'Reset your Belle Kreyashon password.',
    eyebrow: 'Password Reset',
    title: 'Reset your password',
    greetingHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Hello ${escapeHtml(customer.name || 'there')},
      </p>
    `,
    bodyHtml: `
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">
        We received a request to reset your Belle Kreyashon password.
      </p>
    `,
    actions,
    noteHtml: buildEmailNote('This link expires in 15 minutes. If you did not request a password reset, you can ignore this email.'),
  });

  const text = buildEmailText({
    greeting: `Hello ${customer.name || 'there'},`,
    lines: [
      'We received a request to reset your Belle Kreyashon password.',
      'This link expires in 15 minutes. If you did not request a password reset, you can ignore this email.',
    ],
    actions,
  });

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

  const dashboardUrl = buildFrontendLink('/track');
  const libraryUrl = buildFrontendLink('/digital-library');
  const hasDigitalItems = (order.items || []).some((item) => item.isDigital);
  const itemCount = (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const itemLines = (order.items || []).map((item) => (
    `${item.name || 'Item'}${item.variant ? ` (${item.variant})` : ''} x${Number(item.qty) || 0}`
  ));
  const actions = [
    { label: 'View My Dashboard', href: dashboardUrl, tone: 'primary' },
    ...(hasDigitalItems ? [{ label: 'Open My Digital Library', href: libraryUrl, tone: 'secondary' }] : []),
  ];

  const html = buildEmailLayout({
    previewText: `Your order ${order.orderId || ''} has been received.`,
    eyebrow: 'Order Received',
    title: 'Your order is in',
    greetingHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Hello ${escapeHtml(order.customer?.name || 'there')},
      </p>
    `,
    bodyHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Your Belle Kreyashon order <strong style="color:#111111;">${escapeHtml(order.orderId || '')}</strong> has been received successfully.
      </p>
      ${buildEmailList(itemLines)}
    `,
    metaHtml: buildEmailMetaTable([
      { label: 'Order ID', value: order.orderId || 'Pending' },
      { label: 'Total', value: `GHS ${Number(order.total || 0).toLocaleString()}` },
      { label: 'Items', value: `${itemCount} item${itemCount === 1 ? '' : 's'}` },
      { label: 'Fulfillment', value: toTitleCase(order.fulfillment || order.orderType || 'Order') },
    ]),
    actions,
    noteHtml: buildEmailNote('We will keep you updated as your order moves forward.'),
  });

  const text = buildEmailText({
    greeting: `Hello ${order.customer?.name || 'there'},`,
    lines: [
      `Your Belle Kreyashon order ${order.orderId || ''} has been received successfully.`,
      ...itemLines.map((item) => `- ${item}`),
      `Total: GHS ${Number(order.total || 0).toLocaleString()}`,
      `Items: ${itemCount}`,
      `Fulfillment: ${toTitleCase(order.fulfillment || order.orderType || 'Order')}`,
      'We will keep you updated as your order moves forward.',
    ],
    actions,
  });

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

  const dashboardUrl = buildFrontendLink('/track');
  const sessionName = booking.trainingTitle || booking.consultationTitle || booking.bookingId || 'your booking';
  const typeLabel = booking.type === 'training' ? 'training booking' : 'consultation booking';
  const actions = [{ label: 'Open My Dashboard', href: dashboardUrl, tone: 'primary' }];

  const html = buildEmailLayout({
    previewText: `Your ${typeLabel} is confirmed.`,
    eyebrow: booking.type === 'training' ? 'Training Booking' : 'Consultation Booking',
    title: 'Booking confirmed',
    greetingHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Hello ${escapeHtml(booking.customer?.name || 'there')},
      </p>
    `,
    bodyHtml: `
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.75;">
        Your Belle Kreyashon ${escapeHtml(typeLabel)} is confirmed.
      </p>
      <p style="margin:0 0 18px;color:#111111;font-size:18px;line-height:1.5;font-weight:700;">
        ${escapeHtml(sessionName)}
      </p>
    `,
    metaHtml: buildEmailMetaTable([
      { label: 'Booking ID', value: booking.bookingId || 'Pending' },
      { label: 'Type', value: toTitleCase(booking.type || 'Booking') },
      { label: 'Amount Paid', value: `GHS ${Number(booking.amount || 0).toLocaleString()}` },
    ]),
    actions,
  });

  const text = buildEmailText({
    greeting: `Hello ${booking.customer?.name || 'there'},`,
    lines: [
      `Your Belle Kreyashon ${typeLabel} is confirmed.`,
      sessionName,
      `Booking ID: ${booking.bookingId || ''}`,
      `Amount paid: GHS ${Number(booking.amount || 0).toLocaleString()}`,
    ],
    actions,
  });

  return sendCustomerEmail({
    to: email,
    subject: `Booking confirmed - ${booking.bookingId || 'Belle Kreyashon'}`,
    html,
    text,
  });
};
