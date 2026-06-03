import axios from 'axios';
import AbandonedCart from '../Models/AbandonedCart.mjs';
import Booking from '../Models/Booking.mjs';
import Customer from '../Models/Customer.mjs';
import Order from '../Models/Order.mjs';
import { grantDigitalAccessForOrder, processDueTrialCharges } from '../Services/digitalAccessService.mjs';
import { sendAdminOrderNotificationEmail, sendCustomerOrderEmail } from '../Services/customerMailService.mjs';
import { sendMetaOrderEvent } from '../Services/metaConversionsService.mjs';
import { reduceStock } from './productController.mjs';

const WHATSAPP = process.env.WHATSAPP_NUMBER;
const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

const getMarketingRequestContext = (req, browserData = {}) => ({
  browserData: browserData || {},
  clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
  userAgent: req.get('user-agent') || '',
});

const dispatchOrderEmails = (order) => {
  Promise.allSettled([
    sendAdminOrderNotificationEmail({ order }),
    sendCustomerOrderEmail({ order }),
  ]).then((results) => {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(index === 0 ? 'Admin order email failed:' : 'Customer order email failed:', result.reason?.message || result.reason);
      }
    });
  }).catch((err) => {
    console.error('Order email dispatch failed:', err.message);
  });
};

const buildOrderResponse = (order, paymentRef = '') => {
  const msg = buildWhatsAppMessage(order, paymentRef || order.paymentRef || '');
  return {
    order,
    whatsappUrl: `https://wa.me/${WHATSAPP}?text=${msg}`,
    callUrl: `tel:+${WHATSAPP}`,
  };
};

const hasTrialItems = (orderData) => (orderData?.items || []).some((item) => item.isDigital && item.digitalAccessKind === 'trial');
const isFreeOnlyDigitalOrder = (orderData) => {
  const items = orderData?.items || [];
  return items.length > 0
    && items.every((item) => item.isDigital && item.digitalAccessKind === 'free')
    && Number(orderData.total || 0) === 0;
};

const sumAmount = (items = []) => items.reduce((total, item) => total + (Number(item) || 0), 0);

const buildMonthBuckets = (months = 6) => {
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });
  const buckets = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: formatter.format(date),
      amount: 0,
      orders: 0,
      bookings: 0,
    });
  }

  return buckets;
};

const BEST_SELLER_GROUPS = [
  {
    key: 'products',
    label: 'Products',
    description: 'Physical shop items',
    unitLabel: 'unit',
  },
  {
    key: 'digital-products',
    label: 'Digital Products',
    description: 'Guides, templates, downloads and bundles',
    unitLabel: 'unit',
  },
  {
    key: 'training',
    label: 'Training',
    description: 'Paid training bookings',
    unitLabel: 'booking',
  },
  {
    key: 'consultations',
    label: 'Consultations',
    description: 'Paid consultation bookings',
    unitLabel: 'booking',
  },
  {
    key: 'delivery-fees',
    label: 'Delivery Fees',
    description: 'Delivery zones that generated fee revenue',
    unitLabel: 'charge',
  },
];

const DATE_RANGE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatDateRangeLabel = (startDate, endDate) => (
  `${DATE_RANGE_FORMATTER.format(startDate)} - ${DATE_RANGE_FORMATTER.format(endDate)}`
);

const buildBestSellerMonthlyWindows = (months = 3) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  const windows = [];

  for (let offset = 0; offset < months; offset += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const startDate = startOfDay(monthDate);
    const endDate = offset === 0
      ? endOfDay(now)
      : endOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));

    windows.push({
      key: toMonthKey(startDate),
      label: offset === 0 ? `${formatter.format(startDate)} to date` : formatter.format(startDate),
      periodLabel: formatDateRangeLabel(startDate, endDate),
      startDate,
      endDate,
    });
  }

  return windows;
};

const buildPreviousWeekWindow = () => {
  const now = new Date();
  const endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));

  return {
    key: 'previous-week',
    label: 'Previous Week',
    periodLabel: formatDateRangeLabel(startDate, endDate),
    startDate,
    endDate,
  };
};

const createBestSellerGroups = () => new Map(
  BEST_SELLER_GROUPS.map((group) => [
    group.key,
    {
      ...group,
      amount: 0,
      count: 0,
      units: 0,
      topItemsMap: new Map(),
    },
  ])
);

const pushBestSellerEntry = (groupsMap, groupKey, sellerMeta, amount, units = 1) => {
  const group = groupsMap.get(groupKey);
  if (!group) return;

  const cleanAmount = Number(amount) || 0;
  if (cleanAmount <= 0) return;
  const cleanUnits = Math.max(Number(units) || 0, 1);
  const itemKey = sellerMeta?.key || sellerMeta?.label || `unknown-${groupKey}`;
  const itemLabel = sellerMeta?.label || 'Untitled';

  group.amount += cleanAmount;
  group.count += 1;
  group.units += cleanUnits;

  const existingItem = group.topItemsMap.get(itemKey) || {
    key: itemKey,
    label: itemLabel,
    amount: 0,
    count: 0,
    units: 0,
  };

  existingItem.amount += cleanAmount;
  existingItem.count += 1;
  existingItem.units += cleanUnits;
  group.topItemsMap.set(itemKey, existingItem);
};

const finalizeBestSellerGroups = (groupsMap) => BEST_SELLER_GROUPS.map((groupMeta) => {
  const group = groupsMap.get(groupMeta.key) || {
    ...groupMeta,
    amount: 0,
    count: 0,
    units: 0,
    topItemsMap: new Map(),
  };

  return {
    key: group.key,
    label: group.label,
    description: group.description,
    unitLabel: group.unitLabel,
    amount: group.amount,
    count: group.count,
    units: group.units,
    topItems: [...group.topItemsMap.values()]
      .sort((a, b) => b.amount - a.amount || b.units - a.units || a.label.localeCompare(b.label))
      .slice(0, 3),
  };
});

const isWithinDateRange = (value, startDate, endDate) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= startDate && date <= endDate;
};

const buildBestSellerWindow = (orders, bookings, windowMeta) => {
  const groupsMap = createBestSellerGroups();

  orders
    .filter((order) => isWithinDateRange(order.createdAt, windowMeta.startDate, windowMeta.endDate))
    .forEach((order) => {
      if (Number(order.deliveryFee) > 0) {
        const deliveryLabel = order.deliveryZone || (order.fulfillment === 'international' ? 'International Delivery' : 'Delivery Fee');
        pushBestSellerEntry(
          groupsMap,
          'delivery-fees',
          {
            key: `delivery:${String(deliveryLabel).toLowerCase()}`,
            label: deliveryLabel,
          },
          order.deliveryFee,
          1
        );
      }

      (order.items || []).forEach((item) => {
        const qty = Math.max(Number(item.qty) || 0, 1);
        const lineAmount = (Number(item.price) || 0) * qty;
        const groupKey = item.isDigital ? 'digital-products' : 'products';
        const productLabel = [item.name, item.variant].filter(Boolean).join(' - ') || (item.isDigital ? 'Digital product' : 'Product');
        const productKey = item.productId
          ? `${groupKey}:${String(item.productId)}:${item.variant || ''}`
          : `${groupKey}:${productLabel.toLowerCase()}`;

        pushBestSellerEntry(
          groupsMap,
          groupKey,
          { key: productKey, label: productLabel },
          lineAmount,
          qty
        );
      });
    });

  bookings
    .filter((booking) => isWithinDateRange(booking.createdAt, windowMeta.startDate, windowMeta.endDate))
    .forEach((booking) => {
      const isTraining = booking.type === 'training';
      const groupKey = isTraining ? 'training' : 'consultations';
      const bookingLabel = isTraining
        ? booking.trainingTitle || 'Training booking'
        : booking.consultationTitle || 'Consultation booking';
      const entityId = isTraining ? booking.trainingId : booking.consultationId;

      pushBestSellerEntry(
        groupsMap,
        groupKey,
        {
          key: entityId ? `${groupKey}:${String(entityId)}` : `${groupKey}:${bookingLabel.toLowerCase()}`,
          label: bookingLabel,
        },
        booking.amount,
        1
      );
    });

  return {
    key: windowMeta.key,
    label: windowMeta.label,
    periodLabel: windowMeta.periodLabel,
    startDate: windowMeta.startDate,
    endDate: windowMeta.endDate,
    groups: finalizeBestSellerGroups(groupsMap),
  };
};

const getEntryAttribution = (entry = {}) => entry?.sourceAttribution || null;

const getOrderPrimarySourcePath = (order = {}) => {
  const uniquePaths = [...new Set((order.sourcePages || []).filter(Boolean))];
  if (uniquePaths.length === 1) return uniquePaths[0];
  if (uniquePaths.length > 1) return 'mixed-sources';
  return order.sourceAttribution?.sourcePath || order.sourceAttribution?.sourcePage || '';
};

const classifySourcePath = (sourcePath = '') => {
  if (sourcePath === 'mixed-sources') {
    return {
      key: 'mixed-sources',
      label: 'Mixed Cart Sources',
      description: 'Orders that were built from more than one page before checkout',
    };
  }

  const cleanPath = String(sourcePath || '').split('?')[0].trim();

  if (!cleanPath) {
    return { key: 'unknown-source', label: 'Unknown / direct', description: 'Older sales or sales without a saved source page' };
  }
  if (cleanPath === '/') {
    return { key: 'home', label: 'Home Page', description: 'Sales that started from the home page' };
  }
  if (cleanPath === '/shop') {
    return { key: 'shop', label: 'Shop Page', description: 'Sales that started from the main shop listing' };
  }
  if (cleanPath.startsWith('/shop/')) {
    return { key: 'product-pages', label: 'Product Pages', description: 'Sales that started from individual product pages' };
  }
  if (cleanPath === '/digital-products') {
    return { key: 'digital-products-page', label: 'Digital Products Page', description: 'Sales that started from the digital products page' };
  }
  if (cleanPath === '/services') {
    return { key: 'services-page', label: 'Services Page', description: 'Bookings or sales that started from the services page' };
  }
  if (cleanPath.startsWith('/blog')) {
    return { key: 'blog-pages', label: 'Blog Pages', description: 'Sales that started from blog content' };
  }
  if (cleanPath === '/digital-library') {
    return { key: 'digital-library', label: 'Digital Library', description: 'Actions started from the learner digital library' };
  }
  if (cleanPath === '/contact') {
    return { key: 'contact-page', label: 'Contact Page', description: 'Sales that started from the contact page' };
  }
  if (cleanPath === '/about') {
    return { key: 'about-page', label: 'About Page', description: 'Sales that started from the about page' };
  }

  return {
    key: 'other-pages',
    label: 'Other Pages',
    description: cleanPath || 'Pages outside the main shop sections',
  };
};

const buildCampaignInfo = (attribution = {}) => {
  if (!attribution?.utmCampaign && !attribution?.utmSource && !attribution?.utmMedium) {
    return {
      key: 'direct-none',
      label: 'Direct / none',
      description: 'No UTM campaign tags were saved for this sale',
    };
  }

  return {
    key: `${attribution.utmCampaign || ''}|${attribution.utmSource || ''}|${attribution.utmMedium || ''}`.toLowerCase(),
    label: attribution.utmCampaign || attribution.utmSource || 'Tracked campaign',
    description: [attribution.utmSource, attribution.utmMedium].filter(Boolean).join(' • ') || 'UTM-tracked sale',
  };
};

const pushBreakdownAmount = (map, meta, amount) => {
  const existing = map.get(meta.key) || {
    key: meta.key,
    label: meta.label,
    description: meta.description,
    amount: 0,
    count: 0,
  };

  existing.amount += Number(amount) || 0;
  existing.count += 1;
  map.set(meta.key, existing);
};

const buildWhatsAppMessage = (order, paymentRef) => {
  const items = (order.items || []).map((item) => {
    const accessInfo = item.isDigital
      ? ` [digital${item.digitalAccessKind ? ` - ${item.digitalAccessKind}` : ''}${item.accessType ? ` - ${item.accessType}` : ''}${item.digitalAccessKind === 'trial' && item.trialDays ? ` - ${item.trialDays}d trial` : ''}]`
      : '';
    return `- ${item.name || ''}${item.variant ? ` (${item.variant})` : ''} x${item.qty || 0} @ GHS ${item.price || 0}${accessInfo}`;
  }).join('\n');

  const fulfillmentLine = order.fulfillment === 'pickup'
    ? 'Fulfillment: PICKUP - customer will collect'
    : order.fulfillment === 'arranged-delivery'
      ? 'Fulfillment: ARRANGED DELIVERY - customer will confirm delivery method on WhatsApp'
    : order.fulfillment === 'international'
      ? 'Fulfillment: INTERNATIONAL - arrange shipping'
      : order.fulfillment === 'digital'
        ? 'Fulfillment: DIGITAL - customer library access'
        : `Delivery: ${order.deliveryZone} - GHS ${order.deliveryFee}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return encodeURIComponent(
`NEW ORDER - Belle Kreyashon
----------------------
Order ID: ${order.orderId}
Date: ${dateStr} at ${timeStr}
Customer: ${order.customer?.name || ''}
Phone: ${order.customer?.phone || ''}
Email: ${order.customer?.email || 'N/A'}
Address: ${order.customer?.address || 'N/A'}
${fulfillmentLine}

ITEMS:
${items}

Subtotal: GHS ${order.subtotal}
TOTAL: GHS ${order.total}
----------------------
Payment: CONFIRMED
Ref: ${paymentRef}`
  );
};

export const saveAbandonedCart = async (req, res) => {
  try {
    const { name, phone, items } = req.body;
    await AbandonedCart.findOneAndUpdate(
      { phone },
      { name, phone, items, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAbandonedCarts = async (_, res) => {
  try {
    res.json(await AbandonedCart.find().sort({ updatedAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleFollowUp = async (req, res) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) return res.status(404).json({ message: 'Not found' });
    cart.followedUp = !cart.followedUp;
    await cart.save();
    res.json(cart);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyAndCreateOrder = async (req, res) => {
  try {
    const { paymentRef, orderData } = req.body;
    if (!paymentRef || !orderData) {
      return res.status(400).json({ message: 'Payment reference and order data are required' });
    }

    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${paymentRef}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );

    const txn = verify.data?.data;
    if (!txn || txn.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    if (hasTrialItems(orderData) && !txn.authorization?.reusable) {
      return res.status(400).json({
        message: 'This trial requires a reusable card authorization. Please complete checkout with a card and try again.',
      });
    }

    const normalizedOrderData = {
      ...orderData,
      customer: {
        ...(orderData.customer || {}),
        email: orderData.customer?.email || txn.customer?.email || '',
      },
    };

    const order = await Order.create({
      ...normalizedOrderData,
      paymentRef,
      paymentStatus: 'paid',
      paymentPurpose: orderData.paymentPurpose || 'purchase',
      paystackChargedAmount: Number(txn.amount || 0) / 100,
      billingState: hasTrialItems(orderData) ? 'trialing' : 'paid',
      status: 'new',
    });

    if (txn.customer?.customer_code && order.customer?.customerId) {
      await Customer.findOneAndUpdate(
        { customerId: order.customer.customerId },
        {
          paystackCustomerCode: txn.customer.customer_code,
          ...(order.customer?.email ? { email: order.customer.email } : {}),
        }
      ).catch(() => {});
    }

    for (const item of order.items || []) {
      if (item.productId) {
        await reduceStock(item.productId, item.qty);
      }
    }

    try {
      await grantDigitalAccessForOrder(order, {
        authorization: txn.authorization,
        customer: txn.customer,
        paymentRef,
        paystackAmount: Number(txn.amount || 0) / 100,
      });
    } catch (digitalErr) {
      console.error('Digital access grant error:', digitalErr.message);
    }

    sendMetaOrderEvent(order, getMarketingRequestContext(req, orderData?.browserData)).catch((metaErr) => {
      console.error('Meta purchase tracking error:', metaErr.message);
    });
    dispatchOrderEmails(order);

    await AbandonedCart.findOneAndDelete({ phone: order.customer?.phone || normalizedOrderData.customer?.phone });
    res.json(buildOrderResponse(order, paymentRef));
  } catch (err) {
    console.error('Order verification error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const createFreeDigitalOrder = async (req, res) => {
  try {
    const { orderData } = req.body;
    if (!orderData) return res.status(400).json({ message: 'Order data is required' });
    if (!isFreeOnlyDigitalOrder(orderData)) {
      return res.status(400).json({ message: 'This endpoint only supports free digital products' });
    }

    const paymentRef = `FREE-DIGITAL-${Date.now()}`;
    const normalizedOrderData = {
      ...orderData,
      customer: {
        ...(orderData.customer || {}),
        email: orderData.customer?.email || '',
      },
    };
    const order = await Order.create({
      ...normalizedOrderData,
      paymentRef,
      paymentStatus: 'paid',
      paymentPurpose: 'free_claim',
      paystackChargedAmount: 0,
      billingState: 'paid',
      status: 'new',
    });

    await grantDigitalAccessForOrder(order, {
      paymentRef,
      paystackAmount: 0,
    });

    sendMetaOrderEvent(order, getMarketingRequestContext(req, orderData?.browserData)).catch((metaErr) => {
      console.error('Meta free digital tracking error:', metaErr.message);
    });
    dispatchOrderEmails(order);

    await AbandonedCart.findOneAndDelete({ phone: order.customer?.phone || normalizedOrderData.customer?.phone });
    res.status(201).json(buildOrderResponse(order, paymentRef));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
      ];
    }

    res.json(await Order.find(query).sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const [orders, bookings] = await Promise.all([
      Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }),
      Booking.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }),
    ]);

    const activeOrders = orders.filter((order) => order.status !== 'cancelled');
    const cancelledOrderCount = orders.length - activeOrders.length;

    let physicalProductRevenue = 0;
    let digitalProductRevenue = 0;
    let deliveryRevenue = 0;
    let physicalUnits = 0;
    let digitalUnits = 0;
    let freeDigitalClaims = 0;
    let trialOrderCount = 0;
    const pageBreakdownMap = new Map();
    const campaignBreakdownMap = new Map();

    activeOrders.forEach((order) => {
      deliveryRevenue += Number(order.deliveryFee) || 0;
      if ((order.items || []).some((item) => item.isDigital && item.digitalAccessKind === 'trial')) {
        trialOrderCount += 1;
      }

       pushBreakdownAmount(
        pageBreakdownMap,
        classifySourcePath(getOrderPrimarySourcePath(order)),
        order.total
      );
      pushBreakdownAmount(
        campaignBreakdownMap,
        buildCampaignInfo(getEntryAttribution(order)),
        order.total
      );

      (order.items || []).forEach((item) => {
        const qty = Number(item.qty) || 0;
        const lineAmount = (Number(item.price) || 0) * qty;
        if (item.isDigital) {
          digitalProductRevenue += lineAmount;
          digitalUnits += qty;
          if (item.digitalAccessKind === 'free') freeDigitalClaims += qty || 1;
        } else {
          physicalProductRevenue += lineAmount;
          physicalUnits += qty;
        }
      });
    });

    const trainingBookings = bookings.filter((booking) => booking.type === 'training');
    const consultationBookings = bookings.filter((booking) => booking.type === 'consultation');
    const trainingRevenue = sumAmount(trainingBookings.map((booking) => booking.amount));
    const consultationRevenue = sumAmount(consultationBookings.map((booking) => booking.amount));
    const orderRevenue = sumAmount(activeOrders.map((order) => order.total));
    const bookingRevenue = trainingRevenue + consultationRevenue;
    const totalRevenue = orderRevenue + bookingRevenue;

    bookings.forEach((booking) => {
      pushBreakdownAmount(
        pageBreakdownMap,
        classifySourcePath(booking.sourceAttribution?.sourcePath || booking.sourceAttribution?.sourcePage || ''),
        booking.amount
      );
      pushBreakdownAmount(
        campaignBreakdownMap,
        buildCampaignInfo(getEntryAttribution(booking)),
        booking.amount
      );
    });

    const monthlyRevenue = buildMonthBuckets(6);
    const monthlyMap = new Map(monthlyRevenue.map((bucket) => [bucket.key, bucket]));
    const addToMonthlyBucket = (dateValue, amount, key) => {
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return;
      const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthlyMap.get(bucketKey);
      if (!bucket) return;
      bucket.amount += Number(amount) || 0;
      bucket[key] += 1;
    };

    activeOrders.forEach((order) => addToMonthlyBucket(order.createdAt, order.total, 'orders'));
    bookings.forEach((booking) => addToMonthlyBucket(booking.createdAt, booking.amount, 'bookings'));

    const now = Date.now();
    const last7DaysRevenue = totalRevenue === 0
      ? 0
      : sumAmount([
          ...activeOrders
            .filter((order) => now - new Date(order.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
            .map((order) => order.total),
          ...bookings
            .filter((booking) => now - new Date(booking.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
            .map((booking) => booking.amount),
        ]);
    const last30DaysRevenue = totalRevenue === 0
      ? 0
      : sumAmount([
          ...activeOrders
            .filter((order) => now - new Date(order.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000)
            .map((order) => order.total),
          ...bookings
            .filter((booking) => now - new Date(booking.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000)
            .map((booking) => booking.amount),
        ]);

    const revenueDenominator = totalRevenue || 1;
    const breakdown = [
      {
        key: 'products',
        label: 'Products',
        description: 'Physical shop sales',
        amount: physicalProductRevenue,
        count: physicalUnits,
        share: Math.round((physicalProductRevenue / revenueDenominator) * 100),
      },
      {
        key: 'digital-products',
        label: 'Digital Products',
        description: 'Guides, courses, templates and bundles',
        amount: digitalProductRevenue,
        count: digitalUnits,
        share: Math.round((digitalProductRevenue / revenueDenominator) * 100),
      },
      {
        key: 'training',
        label: 'Training',
        description: 'Paid training bookings',
        amount: trainingRevenue,
        count: trainingBookings.length,
        share: Math.round((trainingRevenue / revenueDenominator) * 100),
      },
      {
        key: 'consultations',
        label: 'Consultations',
        description: 'Paid consultation bookings',
        amount: consultationRevenue,
        count: consultationBookings.length,
        share: Math.round((consultationRevenue / revenueDenominator) * 100),
      },
      {
        key: 'delivery-fees',
        label: 'Delivery Fees',
        description: 'Delivery charges collected on paid orders',
        amount: deliveryRevenue,
        count: activeOrders.filter((order) => Number(order.deliveryFee) > 0).length,
        share: Math.round((deliveryRevenue / revenueDenominator) * 100),
      },
    ].sort((a, b) => b.amount - a.amount);

    const pageBreakdown = [...pageBreakdownMap.values()]
      .map((item) => ({
        ...item,
        share: Math.round((item.amount / revenueDenominator) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    const campaignBreakdown = [...campaignBreakdownMap.values()]
      .map((item) => ({
        ...item,
        share: Math.round((item.amount / revenueDenominator) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyBestSellerWindows = buildBestSellerMonthlyWindows(3).map((windowMeta) => (
      buildBestSellerWindow(activeOrders, bookings, windowMeta)
    ));
    const previousWeekBestSellers = buildBestSellerWindow(
      activeOrders,
      bookings,
      buildPreviousWeekWindow()
    );

    const recentSales = [
      ...activeOrders.map((order) => ({
        id: order._id,
        type: 'order',
        source: (order.items || []).every((item) => item.isDigital)
          ? 'Digital Products'
          : (order.items || []).some((item) => item.isDigital)
            ? 'Mixed Order'
            : 'Products',
        title: order.items?.length === 1
          ? order.items[0]?.name || order.orderId
          : `${order.items?.length || 0} item order`,
        customerName: order.customer?.name || 'Customer',
        amount: Number(order.total) || 0,
        createdAt: order.createdAt,
        sourcePage: classifySourcePath(getOrderPrimarySourcePath(order)).label,
        utmCampaign: order.sourceAttribution?.utmCampaign || '',
      })),
      ...bookings.map((booking) => ({
        id: booking._id,
        type: 'booking',
        source: booking.type === 'training' ? 'Training' : 'Consultation',
        title: booking.trainingTitle || booking.consultationTitle || booking.bookingId,
        customerName: booking.customer?.name || 'Customer',
        amount: Number(booking.amount) || 0,
        createdAt: booking.createdAt,
        sourcePage: classifySourcePath(booking.sourceAttribution?.sourcePath || booking.sourceAttribution?.sourcePage || '').label,
        utmCampaign: booking.sourceAttribution?.utmCampaign || '',
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    res.json({
      summary: {
        totalRevenue,
        orderRevenue,
        bookingRevenue,
        physicalProductRevenue,
        digitalProductRevenue,
        trainingRevenue,
        consultationRevenue,
        deliveryRevenue,
        orderCount: activeOrders.length,
        bookingCount: bookings.length,
        cancelledOrderCount,
        freeDigitalClaims,
        trialOrderCount,
        averageOrderValue: activeOrders.length ? Math.round(orderRevenue / activeOrders.length) : 0,
        averageBookingValue: bookings.length ? Math.round(bookingRevenue / bookings.length) : 0,
        last7DaysRevenue,
        last30DaysRevenue,
      },
      breakdown,
      pageBreakdown,
      campaignBreakdown,
      bestSellers: {
        monthly: monthlyBestSellerWindows,
        previousWeek: previousWeekBestSellers,
      },
      monthlyRevenue,
      recentSales,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    order.status = status;
    if (status === 'delivered') order.deliveredAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const { phone } = req.params;
    const orders = await Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const runDigitalTrialBillingTrigger = async (req, res) => {
  try {
    const processed = await processDueTrialCharges();
    res.json({
      message: 'Digital trial billing trigger completed',
      processed,
      authType: req.cronAuthType || 'unknown',
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
