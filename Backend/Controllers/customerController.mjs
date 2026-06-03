import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import Booking from '../Models/Booking.mjs';
import Customer from '../Models/Customer.mjs';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Order from '../Models/Order.mjs';
import { registerCustomerSession, revokeCustomerSession, signCustomerToken } from '../Middlewares/auth.mjs';
import {
  sendCustomerPasswordResetEmail,
  sendCustomerVerificationEmail,
  sendCustomerWelcomeEmail,
} from '../Services/customerMailService.mjs';

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const supportedCustomerCurrencies = new Set(['GHS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN', 'ZAR']);
const supportedCustomerLanguages = new Set(['en', 'fr', 'es', 'pt', 'ar']);

const normalizePhone = (value = '') => {
  const cleaned = String(value || '').replace(/[\s\-().]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};
const normalizeCustomerCurrency = (value = '') => {
  const normalized = String(value || '').trim().toUpperCase();
  return supportedCustomerCurrencies.has(normalized) ? normalized : 'GHS';
};
const normalizeCustomerLanguage = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return supportedCustomerLanguages.has(normalized) ? normalized : 'en';
};

const hashText = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const createToken = () => crypto.randomBytes(24).toString('hex');
const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DEFAULT_FRONTEND_BASE_URL = 'https://bellekreyashon.com';

const resolveCanonicalFrontendBaseUrl = () => {
  const candidates = [
    process.env.SITE_URL,
    process.env.FRONTEND_URL,
    DEFAULT_FRONTEND_BASE_URL,
  ]
    .map((value) => String(value || '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const nonPreviewUrl = candidates.find((value) => {
    try {
      return !/\.pages\.dev$/i.test(new URL(value).hostname);
    } catch {
      return /^https?:\/\//i.test(value) && !/\.pages\.dev(?:\/|$)/i.test(value);
    }
  });

  return nonPreviewUrl || DEFAULT_FRONTEND_BASE_URL;
};

const serializeCustomer = (customer) => ({
  id: String(customer._id || ''),
  customerId: customer.customerId || '',
  name: customer.name || '',
  phone: customer.phone || '',
  email: customer.email || '',
  paystackCustomerCode: customer.paystackCustomerCode || '',
  preferredCurrency: normalizeCustomerCurrency(customer.preferredCurrency),
  preferredLanguage: normalizeCustomerLanguage(customer.preferredLanguage),
  emailVerified: !!customer.emailVerified,
  hasPassword: !!customer.passwordHash,
  lastLoginAt: customer.lastLoginAt || null,
  createdAt: customer.createdAt || null,
});

const buildAuthResponse = async (customer, req, extra = {}, options = {}) => {
  try {
    const session = await registerCustomerSession(customer, req);
    return {
      customer: serializeCustomer(customer),
      customerToken: signCustomerToken(customer, session),
      ...extra,
    };
  } catch (err) {
    if (options.allowSessionFallback && err?.status === 403) {
      return {
        customer: serializeCustomer(customer),
        customerToken: '',
        requiresSignIn: true,
        ...extra,
        message: options.sessionFallbackMessage || extra.message || 'Your account was updated. Sign in again to continue.',
      };
    }
    throw err;
  }
};

const buildFrontendBaseUrl = () => resolveCanonicalFrontendBaseUrl();
const buildVerificationUrl = (token) => `${buildFrontendBaseUrl()}/account/verify?token=${encodeURIComponent(token)}`;
const buildPasswordResetUrl = (token) => `${buildFrontendBaseUrl()}/account/reset-password?token=${encodeURIComponent(token)}`;

const findCustomerByEmail = async (emailAddress = '') => {
  const email = normalizeEmail(emailAddress);
  if (!email) return null;

  const exactMatch = await Customer.findOne({ email });
  if (exactMatch) return exactMatch;

  return Customer.findOne({
    email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
  });
};

const findCustomerByIdentifier = async (identifier = '') => {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);

  if (email && email.includes('@')) {
    return findCustomerByEmail(email);
  }
  if (phone) {
    return Customer.findOne({ phone });
  }
  return null;
};

const ensureUniqueIdentity = async ({ email, phone, customerId = '' }) => {
  if (email) {
    const emailOwner = await Customer.findOne({ email });
    if (emailOwner && String(emailOwner._id) !== String(customerId)) {
      throw new Error('That email address is already linked to another customer');
    }
  }

  if (phone) {
    const phoneOwner = await Customer.findOne({ phone });
    if (phoneOwner && String(phoneOwner._id) !== String(customerId)) {
      throw new Error('That phone number is already linked to another customer');
    }
  }
};

const createEmailVerificationState = () => ({
  token: createToken(),
  expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
});

const createPasswordResetState = () => ({
  token: createToken(),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
});

const buildCustomerLookupQuery = (customer) => {
  const orderQuery = [];
  const bookingQuery = [];
  const digitalQuery = [];

  if (customer?.customerId) {
    orderQuery.push({ 'customer.customerId': customer.customerId });
    bookingQuery.push({ 'customer.customerId': customer.customerId });
    digitalQuery.push({ customerId: customer.customerId });
  }
  if (customer?.email) {
    orderQuery.push({ 'customer.email': customer.email });
    bookingQuery.push({ 'customer.email': customer.email });
    digitalQuery.push({ customerEmail: customer.email });
  }
  if (customer?.phone) {
    orderQuery.push({ 'customer.phone': customer.phone });
    bookingQuery.push({ 'customer.phone': customer.phone });
    digitalQuery.push({ customerPhone: customer.phone });
  }

  return {
    orderFilter: orderQuery.length ? { $or: orderQuery } : { _id: null },
    bookingFilter: bookingQuery.length ? { $or: bookingQuery } : { _id: null },
    digitalFilter: digitalQuery.length ? { $or: digitalQuery } : { _id: null },
  };
};

const buildCustomerAdminSummary = async (customer) => {
  const { orderFilter, bookingFilter, digitalFilter } = buildCustomerLookupQuery(customer);

  const [orderStats, bookingStats, digitalStats] = await Promise.all([
    Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ['$total', 0] } },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ['$amount', 0] } },
          lastBookingAt: { $max: '$createdAt' },
        },
      },
    ]),
    DigitalAccess.aggregate([
      { $match: digitalFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
          lastAccessedAt: { $max: '$lastAccessedAt' },
          lastGrantedAt: { $max: '$createdAt' },
        },
      },
    ]),
  ]);

  const orderSummary = orderStats[0] || {};
  const bookingSummary = bookingStats[0] || {};
  const digitalSummary = digitalStats[0] || {};
  const lastActivityAt = [
    orderSummary.lastOrderAt,
    bookingSummary.lastBookingAt,
    digitalSummary.lastAccessedAt,
    digitalSummary.lastGrantedAt,
    customer.lastLoginAt,
    customer.createdAt,
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

  return {
    totalSpent: Number(orderSummary.totalSpent || 0) + Number(bookingSummary.totalSpent || 0),
    orderCount: Number(orderSummary.count || 0),
    bookingCount: Number(bookingSummary.count || 0),
    digitalProductCount: Number(digitalSummary.count || 0),
    activeDigitalCount: Number(digitalSummary.activeCount || 0),
    lastOrderAt: orderSummary.lastOrderAt || null,
    lastBookingAt: bookingSummary.lastBookingAt || null,
    lastDigitalAccessAt: digitalSummary.lastAccessedAt || digitalSummary.lastGrantedAt || null,
    lastActivityAt,
  };
};

const getAuthenticatedCustomer = async (req) => {
  if (req.customer) return req.customer;
  if (req.customerAuth?.id) {
    const byId = await Customer.findById(req.customerAuth.id);
    if (byId) return byId;
  }
  if (req.customerAuth?.customerId) {
    const byCode = await Customer.findOne({ customerId: req.customerAuth.customerId });
    if (byCode) return byCode;
  }
  if (req.customerAuth?.email) {
    const byEmail = await Customer.findOne({ email: normalizeEmail(req.customerAuth.email) });
    if (byEmail) return byEmail;
  }
  if (req.customerAuth?.phone) {
    return Customer.findOne({ phone: normalizePhone(req.customerAuth.phone) });
  }
  return null;
};

export const identifyCustomer = async (req, res) => {
  try {
    const name = req.body.name?.trim() || '';
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);

    if (!phone && !email) {
      return res.status(400).json({ message: 'Phone or email is required' });
    }

    let customer = null;
    if (phone) customer = await Customer.findOne({ phone });
    if (!customer && email) customer = await Customer.findOne({ email });

    if (!customer) {
      if (!name || !phone || !email) {
        return res.status(400).json({ message: 'Name, phone and email are required for new customers' });
      }

      customer = await Customer.create({ name, phone, email });
    } else {
      await ensureUniqueIdentity({ email, phone, customerId: customer._id });

      if (name && customer.name !== name && !/^\+?\d/.test(name)) customer.name = name;
      if (phone) customer.phone = phone;
      if (email) customer.email = email;
      await customer.save();
    }

    res.json(await buildAuthResponse(customer, req));
  } catch (err) {
    const message = err.message || 'Could not identify customer right now';
    const status = err?.status || (/already linked/.test(message) ? 409 : 500);
    res.status(status).json({ message });
  }
};

export const signupCustomer = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const preferredCurrency = normalizeCustomerCurrency(req.body.preferredCurrency);
    const preferredLanguage = normalizeCustomerLanguage(req.body.preferredLanguage);

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ message: 'Name, phone, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const emailCustomer = await Customer.findOne({ email });
    const phoneCustomer = await Customer.findOne({ phone });

    if (emailCustomer && phoneCustomer && String(emailCustomer._id) !== String(phoneCustomer._id)) {
      return res.status(409).json({
        message: 'That email and phone number are already linked to different customer records. Please contact support so we can merge them safely.',
      });
    }

    const customer = emailCustomer || phoneCustomer || new Customer({ name, phone, email });
    if (customer.passwordHash) {
      return res.status(409).json({ message: 'An account already exists for these details. Please sign in or reset your password.' });
    }

    customer.name = name;
    customer.phone = phone;
    customer.email = email;
    customer.preferredCurrency = preferredCurrency;
    customer.preferredLanguage = preferredLanguage;
    customer.passwordHash = await bcrypt.hash(password, 10);
    customer.lastLoginAt = new Date();

    const verification = createEmailVerificationState();
    customer.emailVerified = false;
    customer.emailVerificationTokenHash = hashText(verification.token);
    customer.emailVerificationExpiresAt = verification.expiresAt;

    await customer.save();

    let emailWarning = '';
    await sendCustomerWelcomeEmail({
      customer,
      verificationUrl: buildVerificationUrl(verification.token),
    }).catch((error) => {
      emailWarning = error.message || 'Account created, but the confirmation email could not be sent right now.';
    });

    res.status(201).json(await buildAuthResponse(customer, req, emailWarning ? { emailWarning } : {}));
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'That email or phone number is already linked to another customer account' });
    }
    res.status(err?.status || 500).json({ message: err.message || 'Could not create account right now' });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email or phone number and password are required' });
    }

    const customer = await findCustomerByIdentifier(identifier);
    if (!customer) {
      return res.status(404).json({ message: 'No customer account was found. Please sign up with the same details you used for checkout.' });
    }
    if (!customer.passwordHash) {
      return res.status(403).json({
        message: customer.email
          ? 'This account does not have a password yet. Use reset password to create one and then sign in.'
          : 'This account does not have a password or email yet. Please contact support so we can finish setting it up safely.',
      });
    }

    const matches = await bcrypt.compare(password, customer.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    customer.lastLoginAt = new Date();
    await customer.save();

    res.json(await buildAuthResponse(customer, req));
  } catch (err) {
    res.status(err?.status || 500).json({ message: err.message || 'Could not sign in right now' });
  }
};

export const getCurrentCustomer = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });
    res.json({ customer: serializeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load your account right now' });
  }
};

export const updateCustomerPreferences = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });

    customer.preferredCurrency = normalizeCustomerCurrency(req.body.preferredCurrency || customer.preferredCurrency);
    customer.preferredLanguage = normalizeCustomerLanguage(req.body.preferredLanguage || customer.preferredLanguage);
    await customer.save();

    res.json({ customer: serializeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not update customer preferences right now' });
  }
};

export const getCustomerDashboard = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });

    const { orderFilter, bookingFilter, digitalFilter } = buildCustomerLookupQuery(customer);
    const [orders, bookings, digitalAccess] = await Promise.all([
      Order.find(orderFilter).sort({ createdAt: -1 }),
      Booking.find(bookingFilter).sort({ createdAt: -1 }),
      DigitalAccess.find(digitalFilter).sort({ createdAt: -1 }),
    ]);

    const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
      + bookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);

    res.json({
      customer: serializeCustomer(customer),
      summary: {
        totalSpent,
        orderCount: orders.length,
        bookingCount: bookings.length,
        digitalProductCount: digitalAccess.length,
        activeDigitalCount: digitalAccess.filter((item) => item.status === 'active').length,
      },
      recentOrders: orders.slice(0, 5),
      recentBookings: bookings.slice(0, 5),
      digitalProducts: digitalAccess.slice(0, 6).map((item) => ({
        id: String(item._id || ''),
        productId: String(item.productId || ''),
        productName: item.productName || '',
        productImage: item.productImage || '',
        productDesc: item.productDesc || '',
        digitalAccessKind: item.digitalAccessKind || 'paid',
        certificateStatus: item.certificateStatus || 'not-applicable',
        status: item.status || 'active',
        lastAccessedAt: item.lastAccessedAt || null,
        createdAt: item.createdAt || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load your dashboard right now' });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });

    const { orderFilter, bookingFilter } = buildCustomerLookupQuery(customer);
    const [orders, bookings] = await Promise.all([
      Order.find(orderFilter).sort({ createdAt: -1 }),
      Booking.find(bookingFilter).sort({ createdAt: -1 }),
    ]);

    res.json({
      customer: serializeCustomer(customer),
      orders,
      bookings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load your order history right now' });
  }
};

export const requestCustomerPasswordReset = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim();
    if (!identifier) {
      return res.status(400).json({ message: 'Email address or phone number is required' });
    }

    const customer = await findCustomerByIdentifier(identifier);
    if (!customer || !customer.email) {
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }

    const normalizedCustomerEmail = normalizeEmail(customer.email);
    if (normalizedCustomerEmail && customer.email !== normalizedCustomerEmail) {
      customer.email = normalizedCustomerEmail;
    }

    const resetState = createPasswordResetState();
    customer.passwordResetTokenHash = hashText(resetState.token);
    customer.passwordResetExpiresAt = resetState.expiresAt;
    await customer.save();

    await sendCustomerPasswordResetEmail({
      customer,
      resetUrl: buildPasswordResetUrl(resetState.token),
    });

    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error('Customer password reset request failed:', err);
    const rawMessage = err.message || 'Could not send password reset email right now';
    const isMailDeliveryError = /smtp|sender email|resend send failed|econn|enotfound|timed out|mail/i.test(rawMessage);

    res.status(500).json({
      message: isMailDeliveryError
        ? 'We could not send the reset email right now. Please try again shortly.'
        : rawMessage,
    });
  }
};

export const resetCustomerPassword = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!token || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const customer = await Customer.findOne({
      passwordResetTokenHash: hashText(token),
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!customer) {
      return res.status(400).json({ message: 'This password reset link is invalid or has expired' });
    }

    customer.passwordHash = await bcrypt.hash(password, 10);
    customer.passwordResetTokenHash = '';
    customer.passwordResetExpiresAt = null;
    if (customer.email) {
      customer.emailVerified = true;
      customer.emailVerificationTokenHash = '';
      customer.emailVerificationExpiresAt = null;
    }
    customer.lastLoginAt = new Date();
    await customer.save();

    res.json(await buildAuthResponse(
      customer,
      req,
      { message: 'Your password has been updated and you are now signed in.' },
      {
        allowSessionFallback: true,
        sessionFallbackMessage: 'Your password has been updated. Sign in on one of your two active devices or wait for a session to expire to continue.',
      }
    ));
  } catch (err) {
    res.status(err?.status || 500).json({ message: err.message || 'Could not reset password right now' });
  }
};

export const verifyCustomerEmail = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const customer = await Customer.findOne({
      emailVerificationTokenHash: hashText(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!customer) {
      return res.status(400).json({ message: 'This email confirmation link is invalid or has expired' });
    }

    customer.emailVerified = true;
    customer.emailVerificationTokenHash = '';
    customer.emailVerificationExpiresAt = null;
    customer.lastLoginAt = new Date();
    await customer.save();

    res.json(await buildAuthResponse(
      customer,
      req,
      { message: 'Your email address has been confirmed.' },
      {
        allowSessionFallback: true,
        sessionFallbackMessage: 'Your email address has been confirmed. Sign in on one of your two active devices or wait for a session to expire to continue.',
      }
    ));
  } catch (err) {
    res.status(err?.status || 500).json({ message: err.message || 'Could not confirm email right now' });
  }
};

export const logoutCustomer = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.json({ message: 'Signed out.' });

    await revokeCustomerSession(customer, req.customerAuth?.sessionId || '');
    res.json({ message: 'Signed out.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not sign out right now' });
  }
};

export const resendCustomerVerification = async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });
    if (!customer.email) return res.status(400).json({ message: 'Add an email address to this account first' });
    if (customer.emailVerified) return res.json({ message: 'Your email address is already confirmed.' });

    const verification = createEmailVerificationState();
    customer.emailVerificationTokenHash = hashText(verification.token);
    customer.emailVerificationExpiresAt = verification.expiresAt;
    await customer.save();

    await sendCustomerVerificationEmail({
      customer,
      verificationUrl: buildVerificationUrl(verification.token),
    });

    res.json({ message: 'A new confirmation email has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not resend confirmation email right now' });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    const customer = await Customer.findOne({ phone });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const orders = await Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
    res.json({ customer: serializeCustomer(customer), orders });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not load order history right now' });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = search
      ? {
        $or: [
          { customerId: { $regex: escapeRegex(search), $options: 'i' } },
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
          { phone: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
      : {};

    const customers = await Customer.find(filter)
      .select('-passwordHash -emailVerificationTokenHash -passwordResetTokenHash')
      .sort({ createdAt: -1 });

    const items = await Promise.all(customers.map(async (customer) => ({
      ...serializeCustomer(customer),
      summary: await buildCustomerAdminSummary(customer),
    })));

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
