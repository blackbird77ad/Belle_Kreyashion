import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import Customer from '../Models/Customer.mjs';

const SECRET = process.env.JWT_SECRET;
const CUSTOMER_SESSION_MAX_DEVICES = Number(process.env.CUSTOMER_MAX_ACTIVE_DEVICES) > 0
  ? Number(process.env.CUSTOMER_MAX_ACTIVE_DEVICES)
  : 2;
const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CUSTOMER_SESSION_TOUCH_MS = 5 * 60 * 1000;
const CUSTOMER_SESSION_REQUIRED_MESSAGE = 'Customer session required';
const CUSTOMER_SESSION_EXPIRED_MESSAGE = 'Customer session expired. Please sign in again.';
const CUSTOMER_SESSION_DEVICE_MESSAGE = 'This customer session is only valid on the device where it was opened';

const hashText = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const normalizeSessionId = (value = '') => String(value || '').trim();
const createSessionId = () => crypto.randomBytes(24).toString('hex');
const buildCustomerSessionExpiry = () => new Date(Date.now() + CUSTOMER_SESSION_TTL_MS);
const parseSessionDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const isCustomerSessionExpired = (session = {}, now = new Date()) => {
  const expiresAt = parseSessionDate(session.expiresAt);
  return !normalizeSessionId(session.sessionId) || !expiresAt || expiresAt <= now;
};
const buildCustomerDeviceLabel = (req, count = 1) => {
  const platform = String(req.headers['sec-ch-ua-platform'] || '').replace(/"/g, '').trim();
  const mobile = String(req.headers['sec-ch-ua-mobile'] || '').replace(/"/g, '').trim();
  const parts = [platform || 'Browser'];
  if (mobile === '?1') parts.push('Mobile');
  return `${parts.join(' ')} ${count}`;
};

export const hashRequestDevice = (req) => hashText([
  req.headers['user-agent'] || '',
  req.headers['accept-language'] || '',
  req.headers['sec-ch-ua-platform'] || '',
  req.headers['sec-ch-ua-mobile'] || '',
].join('|'));

export const hashRequestUserAgent = (req) => hashText(req.headers['user-agent'] || '');

const resolveCustomerFromPayload = async (payload = {}) => {
  if (payload?.id) {
    const byId = await Customer.findById(payload.id);
    if (byId) return byId;
  }
  if (payload?.customerId) {
    const byCode = await Customer.findOne({ customerId: payload.customerId });
    if (byCode) return byCode;
  }
  if (payload?.email) {
    const byEmail = await Customer.findOne({ email: String(payload.email || '').trim().toLowerCase() });
    if (byEmail) return byEmail;
  }
  if (payload?.phone) {
    const cleanedPhone = String(payload.phone || '').replace(/[\s\-().]/g, '');
    if (cleanedPhone) {
      const normalizedPhone = cleanedPhone.startsWith('233') && !cleanedPhone.startsWith('+')
        ? `+${cleanedPhone}`
        : cleanedPhone;
      const byPhone = await Customer.findOne({ phone: normalizedPhone });
      if (byPhone) return byPhone;
    }
  }
  return null;
};

export const pruneExpiredCustomerSessions = (customer, now = new Date()) => {
  const currentSessions = Array.isArray(customer?.customerSessions) ? customer.customerSessions : [];
  const nextSessions = currentSessions.filter((session) => !isCustomerSessionExpired(session, now));
  const changed = nextSessions.length !== currentSessions.length;

  if (changed && customer) {
    customer.customerSessions = nextSessions;
  }

  return {
    sessions: changed ? nextSessions : currentSessions,
    changed,
  };
};

export const listActiveCustomerSessionDeviceHashes = (customer, now = new Date()) => {
  const sessions = Array.isArray(customer?.customerSessions) ? customer.customerSessions : [];
  return sessions
    .filter((session) => !isCustomerSessionExpired(session, now))
    .map((session) => String(session.deviceHash || '').trim())
    .filter(Boolean);
};

export const registerCustomerSession = async (customer, req) => {
  if (!customer) {
    const error = new Error('Customer account not found');
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const { sessions: existingSessions, changed } = pruneExpiredCustomerSessions(customer, now);
  const deviceHash = hashRequestDevice(req);
  const userAgentHash = hashRequestUserAgent(req);
  const matchingSession = existingSessions.find((session) => String(session.deviceHash || '') === deviceHash);

  if (matchingSession) {
    matchingSession.lastSeenAt = now;
    matchingSession.expiresAt = buildCustomerSessionExpiry();
    matchingSession.userAgentHash = userAgentHash;
    matchingSession.label = matchingSession.label || buildCustomerDeviceLabel(req, existingSessions.indexOf(matchingSession) + 1);
    await customer.save();
    return matchingSession;
  }

  if (existingSessions.length >= CUSTOMER_SESSION_MAX_DEVICES) {
    const error = new Error(
      `Your customer account is already active on ${CUSTOMER_SESSION_MAX_DEVICES} devices. Sign out from one of those devices or wait for a session to expire before using another device.`
    );
    error.status = 403;
    throw error;
  }

  const nextSession = {
    sessionId: createSessionId(),
    deviceHash,
    userAgentHash,
    label: buildCustomerDeviceLabel(req, existingSessions.length + 1),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: buildCustomerSessionExpiry(),
  };

  customer.customerSessions = [...existingSessions, nextSession];
  if (!changed) {
    customer.markModified('customerSessions');
  }
  await customer.save();

  return (customer.customerSessions || []).find((session) => session.sessionId === nextSession.sessionId) || nextSession;
};

export const revokeCustomerSession = async (customer, sessionId = '') => {
  if (!customer) return false;

  const normalizedSessionId = normalizeSessionId(sessionId);
  const currentSessions = Array.isArray(customer.customerSessions) ? customer.customerSessions : [];
  const nextSessions = currentSessions.filter((session) => normalizeSessionId(session.sessionId) !== normalizedSessionId);

  if (nextSessions.length === currentSessions.length) return false;

  customer.customerSessions = nextSessions;
  await customer.save();
  return true;
};

export const signAdminToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

export const signCustomerToken = (customer, session) => jwt.sign({
  id: String(customer._id || ''),
  customerId: customer.customerId,
  phone: customer.phone,
  email: customer.email || '',
  name: customer.name,
  emailVerified: !!customer.emailVerified,
  sessionId: normalizeSessionId(session?.sessionId),
}, SECRET, { expiresIn: '30d' });

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const validateCustomerRequest = async (req, { optional = false } = {}) => {
  const token = req.headers['x-customer-token'];
  if (!token) {
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: CUSTOMER_SESSION_REQUIRED_MESSAGE };
  }

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: CUSTOMER_SESSION_EXPIRED_MESSAGE };
  }

  const sessionId = normalizeSessionId(payload?.sessionId);
  if (!sessionId) {
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: CUSTOMER_SESSION_EXPIRED_MESSAGE };
  }

  const customer = await resolveCustomerFromPayload(payload);
  if (!customer) {
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: 'Customer account not found' };
  }

  const now = new Date();
  const { sessions, changed } = pruneExpiredCustomerSessions(customer, now);
  const session = sessions.find((entry) => normalizeSessionId(entry.sessionId) === sessionId);

  if (!session) {
    if (changed) await customer.save();
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: CUSTOMER_SESSION_EXPIRED_MESSAGE };
  }

  if (String(session.deviceHash || '') !== hashRequestDevice(req)) {
    return optional
      ? { ok: false }
      : { ok: false, status: 401, message: CUSTOMER_SESSION_DEVICE_MESSAGE };
  }

  const lastSeenAt = parseSessionDate(session.lastSeenAt);
  const shouldTouchSession = !lastSeenAt || (now.getTime() - lastSeenAt.getTime()) >= CUSTOMER_SESSION_TOUCH_MS;
  if (shouldTouchSession || changed) {
    session.lastSeenAt = now;
    await customer.save();
  }

  return {
    ok: true,
    payload,
    customer,
    session,
  };
};

export const readOptionalCustomerAuth = async (req) => {
  const state = await validateCustomerRequest(req, { optional: true });
  return state.ok ? state.payload : null;
};

export const protectCustomer = async (req, res, next) => {
  try {
    const state = await validateCustomerRequest(req);
    if (!state.ok) {
      return res.status(state.status).json({ message: state.message });
    }

    req.customerAuth = state.payload;
    req.customer = state.customer;
    req.customerSession = state.session;
    next();
  } catch {
    res.status(401).json({ message: CUSTOMER_SESSION_EXPIRED_MESSAGE });
  }
};

export const protectAdminOrCron = (req, res, next) => {
  const cronSecret = process.env.DIGITAL_TRIAL_CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'];

  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    req.cronAuthType = 'secret';
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Admin token or cron secret required' });

  try {
    req.admin = jwt.verify(token, SECRET);
    req.cronAuthType = 'admin';
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
