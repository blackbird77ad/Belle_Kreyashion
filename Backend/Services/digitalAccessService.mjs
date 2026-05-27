import axios from 'axios';
import DigitalAccess from '../Models/DigitalAccess.mjs';
import Order from '../Models/Order.mjs';
import Product from '../Models/Product.mjs';

const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
const DEFAULT_DEVICE_LIMIT = 2;
const DEFAULT_TRIAL_DAYS = 7;
const TRIAL_WORKER_INTERVAL_MS = Number(process.env.DIGITAL_TRIAL_WORKER_INTERVAL_MS) || (60 * 60 * 1000);

let workerStarted = false;
let workerRunning = false;

const snapshotFiles = (product) => [...(product.digitalFiles || [])]
  .sort((a, b) => {
    const aStep = a.stepNumber ?? Number.MAX_SAFE_INTEGER;
    const bStep = b.stepNumber ?? Number.MAX_SAFE_INTEGER;
    if (aStep !== bStep) return aStep - bStep;
    return String(a.label || '').localeCompare(String(b.label || ''));
  })
  .map((file) => ({
  assetId: String(file._id),
  label: file.label || file.originalFilename || 'Digital File',
  stepNumber: file.stepNumber ?? null,
  stepTitle: file.stepTitle || '',
  stepSummary: file.stepSummary || '',
  secureUrl: file.secureUrl,
  originalFilename: file.originalFilename || '',
  downloadName: file.downloadName || file.originalFilename || 'download',
  mimeType: file.mimeType || '',
  resourceType: file.resourceType || 'raw',
  fileKind: file.fileKind || 'other',
  bytes: file.bytes || 0,
}));

const buildModuleProgress = (product) => snapshotFiles(product).map((file) => ({
  assetId: file.assetId,
  label: file.label,
  stepNumber: file.stepNumber ?? null,
  openedAt: null,
  completedAt: null,
}));

const resolveExpiry = ({ accessType, accessMonths, baseDate = new Date() }) => {
  if (accessType === 'lifetime') return null;
  if (!accessMonths || accessMonths <= 0) return null;
  const expiry = new Date(baseDate);
  expiry.setMonth(expiry.getMonth() + Number(accessMonths));
  return expiry;
};

const buildBillingAuthorization = (context = {}, fallbackEmail = '') => {
  const authorization = context.authorization;
  if (!authorization?.authorization_code) return null;

  return {
    authorizationCode: authorization.authorization_code || '',
    signature: authorization.signature || '',
    reusable: !!authorization.reusable,
    last4: authorization.last4 || '',
    bin: authorization.bin || '',
    bank: authorization.bank || '',
    brand: authorization.brand || '',
    cardType: authorization.card_type || '',
    expMonth: authorization.exp_month || '',
    expYear: authorization.exp_year || '',
    email: context.customer?.email || fallbackEmail || '',
    customerCode: context.customer?.customer_code || '',
    setupReference: context.paymentRef || '',
    setupChargedAmount: Number(context.paystackAmount) || 0,
  };
};

const appendOrderTrialEvent = async (orderId, event) => {
  if (!orderId) return;
  await Order.findByIdAndUpdate(orderId, {
    billingState: event.status === 'charged' ? 'paid' : event.status === 'failed' ? 'failed' : 'trialing',
    $push: { trialChargeHistory: event },
  }).catch(() => {});
};

export const grantDigitalAccessForOrder = async (order, context = {}) => {
  const digitalItems = (order.items || []).filter((item) => item.isDigital && item.productId);
  if (!digitalItems.length) return [];

  const productIds = [...new Set(digitalItems.map((item) => String(item.productId)))];
  const products = await Product.find({ _id: { $in: productIds }, isDigital: true });
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const grants = [];

  for (const item of digitalItems) {
    const product = productsById.get(String(item.productId));
    if (!product || !product.digitalFiles?.length) continue;

    const digitalAccessKind = item.digitalAccessKind || product.digitalAccessKind || 'paid';
    const configuredAccessType = item.accessType
      || (product.accessMode === 'limited' ? 'limited' : 'lifetime');
    const accessType = configuredAccessType === 'limited' ? 'limited' : 'lifetime';
    const accessMonths = accessType === 'limited'
      ? Number(item.accessMonths) || Number(product.limitedAccessMonths) || 6
      : null;
    const trialDays = digitalAccessKind === 'trial'
      ? Math.max(1, Number(item.trialDays) || Number(product.freeTrialDays) || DEFAULT_TRIAL_DAYS)
      : 0;

    const now = new Date();
    const trialEndsAt = digitalAccessKind === 'trial'
      ? new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000))
      : null;
    const expiresAt = resolveExpiry({
      accessType,
      accessMonths,
      baseDate: trialEndsAt || now,
    });

    const billingAmount = digitalAccessKind === 'trial'
      ? Number(item.trialChargeAmount ?? item.price ?? product.retailPrice) || 0
      : 0;
    const billingAuthorization = digitalAccessKind === 'trial'
      ? buildBillingAuthorization(context, order.customer?.email || '')
      : null;

    const eventMessage = digitalAccessKind === 'trial'
      ? `${trialDays}-day free trial started`
      : digitalAccessKind === 'free'
        ? 'Free digital access unlocked'
        : 'Digital purchase completed';

    const grant = await DigitalAccess.findOneAndUpdate(
      { order: order._id, productId: product._id },
      {
        order: order._id,
        orderId: order.orderId,
        paymentRef: order.paymentRef || '',
        productId: product._id,
        productName: product.name,
        productImage: product.images?.[0] || '',
        productDesc: product.desc || '',
        digitalType: product.digitalType || 'other',
        digitalAccessKind,
        trialStatus: digitalAccessKind === 'trial' ? 'trialing' : 'none',
        trialEndsAt,
        trialConvertedAt: null,
        billingAmount,
        billingCurrency: 'GHS',
        billingAuthorization,
        accessType,
        accessMonths,
        expiresAt,
        customerId: order.customer?.customerId || '',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || '',
        customerName: order.customer?.name || '',
        quantity: item.qty || 1,
        status: expiresAt && expiresAt <= new Date() ? 'expired' : 'active',
        files: snapshotFiles(product),
        maxDevices: DEFAULT_DEVICE_LIMIT,
        billingEvents: [{
          reference: context.paymentRef || order.paymentRef || '',
          amount: Number(context.paystackAmount) || 0,
          status: digitalAccessKind === 'trial' ? 'trial-started' : 'charged',
          message: eventMessage,
          createdAt: new Date(),
        }],
        isSeries: !!product.isSeries,
        seriesTitle: product.seriesTitle || '',
        seriesDescription: product.seriesDescription || '',
        isCertified: !!product.isCertified,
        certificateTitle: product.certificateTitle || product.name,
        certificateDescription: product.certificateDescription || '',
        certificateStatus: product.isCertified ? 'in-progress' : 'not-applicable',
        moduleProgress: buildModuleProgress(product),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    grants.push(grant);
  }

  return grants;
};

export const processDueTrialCharges = async () => {
  if (!PAYSTACK_KEY) return 0;

  const dueGrants = await DigitalAccess.find({
    status: 'active',
    trialStatus: 'trialing',
    trialEndsAt: { $lte: new Date() },
    billingAmount: { $gt: 0 },
    'billingAuthorization.reusable': true,
    'billingAuthorization.authorizationCode': { $ne: '' },
  }).sort({ trialEndsAt: 1 });

  let processed = 0;

  for (const grant of dueGrants) {
    const amountSubunit = Math.round((Number(grant.billingAmount) || 0) * 100);
    if (amountSubunit <= 0) {
      grant.trialStatus = 'converted';
      grant.trialConvertedAt = new Date();
      grant.lastChargeError = '';
      grant.billingEvents.push({
        reference: '',
        amount: 0,
        status: 'charged',
        message: 'Trial completed with no extra charge required',
        createdAt: new Date(),
      });
      await grant.save();
      await appendOrderTrialEvent(grant.order, {
        reference: '',
        amount: 0,
        status: 'charged',
        message: 'Trial completed with no extra charge required',
        createdAt: new Date(),
      });
      processed += 1;
      continue;
    }

    grant.lastChargeAttemptAt = new Date();
    grant.chargeAttempts = (grant.chargeAttempts || 0) + 1;

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          authorization_code: grant.billingAuthorization.authorizationCode,
          email: grant.billingAuthorization.email || grant.customerEmail,
          amount: String(amountSubunit),
          metadata: {
            purpose: 'digital_trial_conversion',
            grantId: String(grant._id),
            orderId: grant.orderId,
            productId: String(grant.productId),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paystackData = response.data?.data;
      if (response.data?.status && paystackData?.status === 'success') {
        grant.trialStatus = 'converted';
        grant.trialConvertedAt = new Date();
        grant.lastChargeReference = paystackData.reference || '';
        grant.lastChargeError = '';
        grant.billingEvents.push({
          reference: paystackData.reference || '',
          amount: grant.billingAmount,
          status: 'charged',
          message: 'Trial converted and charged automatically',
          createdAt: new Date(),
        });
        await grant.save();

        await appendOrderTrialEvent(grant.order, {
          reference: paystackData.reference || '',
          amount: grant.billingAmount,
          status: 'charged',
          message: 'Trial converted and charged automatically',
          createdAt: new Date(),
        });
      } else {
        const message = paystackData?.gateway_response || response.data?.message || 'Automatic billing failed';
        grant.trialStatus = 'payment-failed';
        grant.status = 'revoked';
        grant.lastChargeError = message;
        grant.billingEvents.push({
          reference: paystackData?.reference || '',
          amount: grant.billingAmount,
          status: 'failed',
          message,
          createdAt: new Date(),
        });
        await grant.save();

        await appendOrderTrialEvent(grant.order, {
          reference: paystackData?.reference || '',
          amount: grant.billingAmount,
          status: 'failed',
          message,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Automatic billing failed';
      grant.trialStatus = 'payment-failed';
      grant.status = 'revoked';
      grant.lastChargeError = message;
      grant.billingEvents.push({
        reference: '',
        amount: grant.billingAmount,
        status: 'failed',
        message,
        createdAt: new Date(),
      });
      await grant.save();

      await appendOrderTrialEvent(grant.order, {
        reference: '',
        amount: grant.billingAmount,
        status: 'failed',
        message,
        createdAt: new Date(),
      });
    }

    processed += 1;
  }

  return processed;
};

export const startDigitalTrialBillingWorker = () => {
  if (workerStarted || process.env.ENABLE_DIGITAL_TRIAL_BILLING === 'false') return;

  const run = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await processDueTrialCharges();
    } catch (err) {
      console.error('Digital trial billing worker error:', err.message);
    } finally {
      workerRunning = false;
    }
  };

  workerStarted = true;
  setTimeout(run, 15000);
  setInterval(run, TRIAL_WORKER_INTERVAL_MS);
};
