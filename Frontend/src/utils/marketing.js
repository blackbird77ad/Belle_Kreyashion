const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8002').trim();
const SITE_URL = 'https://bellekreyashon.com';
const CONSENT_STORAGE_KEY = 'bk_marketing_consent_v1';
const FACEBOOK_CLICK_STORAGE_KEY = 'bk_facebook_click_id_v1';
const TRACKED_ORDER_PREFIX = 'bk_marketing_order_';
const TRACKED_BOOKING_PREFIX = 'bk_marketing_booking_';
const DEFAULT_CURRENCY = 'GHS';

const config = {
  gtmId: String(import.meta.env.VITE_GTM_ID || '').trim(),
  ga4Id: String(import.meta.env.VITE_GA4_ID || '').trim(),
  googleAdsId: String(import.meta.env.VITE_GOOGLE_ADS_ID || '').trim(),
  googleAdsPurchaseLabel: String(import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '').trim(),
  googleAdsBeginCheckoutLabel: String(import.meta.env.VITE_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL || '').trim(),
  googleAdsWhatsAppLabel: String(import.meta.env.VITE_GOOGLE_ADS_WHATSAPP_LABEL || '').trim(),
  googleAdsPhoneLabel: String(import.meta.env.VITE_GOOGLE_ADS_PHONE_LABEL || '').trim(),
  metaPixelId: String(import.meta.env.VITE_META_PIXEL_ID || '').trim(),
  clarityProjectId: String(import.meta.env.VITE_CLARITY_PROJECT_ID || '').trim(),
};

const state = {
  bootstrapped: false,
  consentInitialized: false,
  gtmLoaded: false,
  googleTagLoaded: false,
  googleTagConfigured: false,
  metaLoaded: false,
  metaConfigured: false,
  clarityLoaded: false,
};

const consentListeners = new Set();

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const canUseStorage = () => canUseDOM() && !!window.localStorage;

const safeReadStorage = (key) => {
  if (!canUseStorage()) return '';
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const safeWriteStorage = (key, value) => {
  if (!canUseStorage()) return;
  try {
    if (value === null || value === undefined || value === '') {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const readCookie = (name) => {
  if (!canUseDOM()) return '';
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : '';
};

const writeCookie = (name, value, maxAgeSeconds = 90 * 24 * 60 * 60) => {
  if (!canUseDOM() || !value) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const ensureDataLayer = () => {
  if (!canUseDOM()) return [];
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
};

const ensureGoogleQueue = () => {
  if (!canUseDOM()) return null;
  const dataLayer = ensureDataLayer();
  window.gtag = window.gtag || function gtag() {
    dataLayer.push(arguments);
  };
  return window.gtag;
};

const loadScriptOnce = (id, src) => {
  if (!canUseDOM()) return null;
  const existing = document.getElementById(id);
  if (existing) return existing;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
  return script;
};

const loadInlineScriptOnce = (id, content) => {
  if (!canUseDOM() || document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.text = content;
  document.head.appendChild(script);
};

const getConsentState = () => safeReadStorage(CONSENT_STORAGE_KEY);

const buildGoogleConsentState = (granted) => ({
  ad_storage: granted ? 'granted' : 'denied',
  ad_user_data: granted ? 'granted' : 'denied',
  ad_personalization: granted ? 'granted' : 'denied',
  analytics_storage: granted ? 'granted' : 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
});

const notifyConsentListeners = (value) => {
  consentListeners.forEach((listener) => {
    try {
      listener(value);
    } catch {
      return;
    }
  });
};

const initializeConsentMode = () => {
  if (!canUseDOM() || state.consentInitialized) return;
  const gtag = ensureGoogleQueue();
  if (!gtag) return;

  const granted = getConsentState() === 'granted';
  gtag('consent', 'default', {
    ...buildGoogleConsentState(granted),
    wait_for_update: 500,
  });

  if (granted) {
    gtag('consent', 'update', buildGoogleConsentState(true));
  }

  state.consentInitialized = true;
};

const loadGoogleTag = () => {
  const directGoogleId = config.googleAdsId || (!config.gtmId ? config.ga4Id : '');
  if (!directGoogleId || state.googleTagLoaded) return;

  loadScriptOnce('bk-google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(directGoogleId)}`);
  state.googleTagLoaded = true;
};

const configureGoogleTag = () => {
  if (!canUseDOM() || state.googleTagConfigured) return;
  if (!config.googleAdsId && !config.ga4Id) return;

  const gtag = ensureGoogleQueue();
  if (!gtag) return;

  gtag('js', new Date());

  if (config.googleAdsId) {
    gtag('config', config.googleAdsId, {
      allow_enhanced_conversions: true,
    });
  }

  if (!config.gtmId && config.ga4Id) {
    gtag('config', config.ga4Id, {
      send_page_view: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
    });
  }

  state.googleTagConfigured = true;
};

const loadGtm = () => {
  if (!config.gtmId || state.gtmLoaded || !canUseDOM()) return;
  ensureDataLayer().push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  });
  loadScriptOnce('bk-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`);
  state.gtmLoaded = true;
};

const ensureMetaQueue = () => {
  if (!canUseDOM()) return null;
  if (window.fbq) return window.fbq;

  const fbq = function fbqShim() {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
      return;
    }
    fbq.queue.push(arguments);
  };

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
};

const loadMetaPixel = () => {
  if (!config.metaPixelId || state.metaLoaded || !hasMarketingConsent()) return;
  const fbq = ensureMetaQueue();
  if (!fbq) return;

  loadScriptOnce('bk-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');

  if (!state.metaConfigured) {
    fbq('init', config.metaPixelId);
    state.metaConfigured = true;
  }

  state.metaLoaded = true;
};

const loadClarity = () => {
  if (!config.clarityProjectId || state.clarityLoaded || !hasMarketingConsent()) return;

  loadInlineScriptOnce(
    'bk-clarity-loader',
    `window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};`
  );
  loadScriptOnce('bk-clarity-script', `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`);
  state.clarityLoaded = true;
};

const syncOptionalScriptsWithConsent = () => {
  if (!hasMarketingConsent()) return;
  loadMetaPixel();
  loadClarity();
};

const normalizeUrl = (value = '') => {
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const getPagePath = (locationLike = {}) => {
  const pathname = locationLike.pathname || (canUseDOM() ? window.location.pathname : '/') || '/';
  const search = locationLike.search || (canUseDOM() ? window.location.search : '') || '';
  return `${pathname}${search}`;
};

const getPageUrl = (locationLike = {}) => normalizeUrl(getPagePath(locationLike));

const normalizePhoneDigits = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.startsWith('233') && digits.length === 12) return digits;
  return digits;
};

const normalizePhoneE164 = (value = '') => {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : '';
};

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const splitName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
};

const buildGoogleUserData = (customer = {}) => {
  const email = normalizeEmail(customer.email);
  const phoneNumber = normalizePhoneE164(customer.phone);
  const { firstName, lastName } = splitName(customer.name);

  const userData = {};
  if (email) userData.email = email;
  if (phoneNumber) userData.phone_number = phoneNumber;
  if (firstName || lastName) {
    userData.address = {
      first_name: firstName,
      last_name: lastName,
      country: 'GH',
    };
  }

  return userData;
};

const cleanObject = (value = {}) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => {
    if (item === null || item === undefined || item === '') return false;
    if (Array.isArray(item)) return item.length > 0;
    return true;
  })
);

const generateEventId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const rememberFacebookClickId = (locationLike = {}) => {
  if (!canUseDOM()) return;
  const search = locationLike.search || window.location.search || '';
  const params = new URLSearchParams(search);
  const fbclid = params.get('fbclid');
  if (!fbclid) return;

  const clickId = `fb.1.${Date.now()}.${fbclid}`;
  safeWriteStorage(FACEBOOK_CLICK_STORAGE_KEY, clickId);
  writeCookie('_fbc', clickId);
};

const getFacebookBrowserData = () => ({
  fbc: readCookie('_fbc') || safeReadStorage(FACEBOOK_CLICK_STORAGE_KEY),
  fbp: readCookie('_fbp'),
});

export const getMarketingBrowserData = () => cleanObject(getFacebookBrowserData());

const syncGoogleUserData = (customer = {}) => {
  if (!canUseDOM() || !window.gtag || !config.googleAdsId) return;
  const userData = buildGoogleUserData(customer);
  if (!Object.keys(userData).length) return;
  window.gtag('set', 'user_data', userData);
};

const pushDataLayerEvent = (event, payload = {}) => {
  ensureDataLayer().push(cleanObject({ event, ...payload }));
};

const sendGa4Event = (event, payload = {}) => {
  if (!canUseDOM() || !window.gtag || config.gtmId || !config.ga4Id) return;
  window.gtag('event', event, cleanObject(payload));
};

const sendGoogleAdsConversion = ({ label = '', value = 0, currency = DEFAULT_CURRENCY, transactionId = '', customer = {} }) => {
  if (!canUseDOM() || !window.gtag || !config.googleAdsId || !label || !hasMarketingConsent()) return;

  syncGoogleUserData(customer);
  window.gtag('event', 'conversion', cleanObject({
    send_to: `${config.googleAdsId}/${label}`,
    value: Number(value) || 0,
    currency,
    transaction_id: transactionId || undefined,
  }));
};

const sendMetaPixelEvent = ({ eventName, customData = {}, eventId = '' }) => {
  if (!canUseDOM() || !window.fbq || !hasMarketingConsent()) return;
  window.fbq('track', eventName, cleanObject(customData), eventId ? { eventID: eventId } : undefined);
};

const postMetaEvent = async ({ eventName, eventId = '', customer = {}, customData = {}, eventSourceUrl = '', actionSource = 'website' }) => {
  if (!hasMarketingConsent()) return;

  try {
    await fetch(`${API_BASE}/api/marketing/meta/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(cleanObject({
        eventName,
        eventId,
        eventSourceUrl: eventSourceUrl || getPageUrl(),
        actionSource,
        customer: cleanObject({
          name: customer.name,
          email: normalizeEmail(customer.email),
          phone: customer.phone,
          customerId: customer.customerId,
          address: customer.address || customer.savedAddress,
        }),
        browserData: cleanObject(getFacebookBrowserData()),
        customData,
      })),
    });
  } catch {
    return;
  }
};

const buildItemId = (item = {}) => String(item.productId || item._id || item.slug || item.name || '').trim();

const buildAnalyticsItem = (item = {}, overrides = {}) => cleanObject({
  item_id: buildItemId(item),
  item_name: item.name || 'Product',
  item_brand: item.brand || 'Belle Kreyashon',
  item_category: item.category || '',
  item_variant: item.variant || '',
  price: Number(overrides.price ?? item.price ?? item.retailPrice ?? item.wholesalePrice ?? 0) || 0,
  quantity: Math.max(Number(overrides.quantity ?? item.qty ?? 1) || 1, 1),
});

const buildMetaContents = (items = []) => items.map((item) => cleanObject({
  id: buildItemId(item),
  quantity: Math.max(Number(item.qty ?? 1) || 1, 1),
  item_price: Number(item.price ?? 0) || 0,
})).filter((item) => item.id);

const markOrderTracked = (orderId) => {
  if (!orderId) return;
  safeWriteStorage(`${TRACKED_ORDER_PREFIX}${orderId}`, '1');
};

const hasOrderBeenTracked = (orderId) => safeReadStorage(`${TRACKED_ORDER_PREFIX}${orderId}`) === '1';

const markBookingTracked = (bookingId) => {
  if (!bookingId) return;
  safeWriteStorage(`${TRACKED_BOOKING_PREFIX}${bookingId}`, '1');
};

const hasBookingBeenTracked = (bookingId) => safeReadStorage(`${TRACKED_BOOKING_PREFIX}${bookingId}`) === '1';

export const hasMarketingConsent = () => getConsentState() === 'granted';

export const getMarketingConsent = () => getConsentState();

export const onMarketingConsentChange = (listener) => {
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
};

export const getMarketingConfig = () => ({ ...config });

export const bootstrapMarketing = () => {
  if (!canUseDOM() || state.bootstrapped) return;
  ensureDataLayer();
  ensureGoogleQueue();
  initializeConsentMode();
  loadGtm();
  loadGoogleTag();
  configureGoogleTag();
  rememberFacebookClickId();
  syncOptionalScriptsWithConsent();
  state.bootstrapped = true;
};

export const setMarketingConsent = (value) => {
  const normalized = value === 'granted' ? 'granted' : 'denied';
  safeWriteStorage(CONSENT_STORAGE_KEY, normalized);
  bootstrapMarketing();

  if (canUseDOM() && window.gtag) {
    window.gtag('consent', 'update', buildGoogleConsentState(normalized === 'granted'));
  }

  syncOptionalScriptsWithConsent();
  notifyConsentListeners(normalized);

  if (normalized === 'granted' && canUseDOM() && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

export const trackPageView = (locationLike = {}) => {
  bootstrapMarketing();
  rememberFacebookClickId(locationLike);

  const pagePath = getPagePath(locationLike);
  const pageUrl = getPageUrl(locationLike);
  const pageTitle = canUseDOM() ? document.title : 'Belle Kreyashon';
  const payload = {
    page_title: pageTitle,
    page_path: pagePath,
    page_location: pageUrl,
  };

  pushDataLayerEvent('page_view', payload);
  sendGa4Event('page_view', payload);

  if (hasMarketingConsent()) {
    loadMetaPixel();
    if (canUseDOM() && window.fbq) window.fbq('track', 'PageView');
  }
};

export const trackProductView = ({ product = {}, price = 0 } = {}) => {
  if (!product?.name) return;
  bootstrapMarketing();

  const item = buildAnalyticsItem(product, { price, quantity: 1 });
  const payload = {
    currency: DEFAULT_CURRENCY,
    value: Number(price || item.price || 0) || 0,
    items: [item],
  };

  pushDataLayerEvent('view_item', payload);
  sendGa4Event('view_item', payload);

  if (hasMarketingConsent()) {
    sendMetaPixelEvent({
      eventName: 'ViewContent',
      customData: {
        content_ids: [item.item_id],
        content_name: item.item_name,
        content_type: 'product',
        value: payload.value,
        currency: DEFAULT_CURRENCY,
      },
      eventId: generateEventId('view-item'),
    });
  }
};

export const trackAddToCart = ({ product = {}, quantity = 1, price = 0, variant = '', customer = {} } = {}) => {
  if (!product?.name) return;
  bootstrapMarketing();

  const item = buildAnalyticsItem({ ...product, variant }, { price, quantity });
  const value = (Number(price || item.price || 0) || 0) * (Number(quantity) || 1);
  const payload = {
    currency: DEFAULT_CURRENCY,
    value,
    items: [item],
  };

  pushDataLayerEvent('add_to_cart', payload);
  sendGa4Event('add_to_cart', payload);

  if (hasMarketingConsent()) {
    sendMetaPixelEvent({
      eventName: 'AddToCart',
      customData: {
        content_ids: [item.item_id],
        content_name: item.item_name,
        content_type: 'product',
        value,
        currency: DEFAULT_CURRENCY,
      },
      eventId: generateEventId('add-to-cart'),
    });
  }

  syncGoogleUserData(customer);
};

export const trackBeginCheckout = ({ items = [], value = 0, customer = {}, source = 'shop_checkout', contentType = 'product' } = {}) => {
  bootstrapMarketing();

  const analyticsItems = items.map((item) => buildAnalyticsItem(item)).filter((item) => item.item_id || item.item_name);
  const eventId = generateEventId('begin-checkout');
  const payload = {
    currency: DEFAULT_CURRENCY,
    value: Number(value) || 0,
    items: analyticsItems,
    checkout_source: source,
  };

  pushDataLayerEvent('begin_checkout', payload);
  sendGa4Event('begin_checkout', payload);
  sendGoogleAdsConversion({
    label: config.googleAdsBeginCheckoutLabel,
    value: Number(value) || 0,
    currency: DEFAULT_CURRENCY,
    customer,
  });

  if (hasMarketingConsent()) {
    const customData = {
      currency: DEFAULT_CURRENCY,
      value: Number(value) || 0,
      content_ids: analyticsItems.map((item) => item.item_id).filter(Boolean),
      contents: buildMetaContents(items),
      content_type: contentType,
      num_items: analyticsItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    };

    sendMetaPixelEvent({
      eventName: 'InitiateCheckout',
      customData,
      eventId,
    });
    postMetaEvent({
      eventName: 'InitiateCheckout',
      eventId,
      customer,
      customData,
    });
  }

  return eventId;
};

export const trackContactClick = ({ channel = '', label = '', url = '', customer = {} } = {}) => {
  if (!channel) return;
  bootstrapMarketing();

  const eventId = generateEventId(`contact-${channel}`);
  const payload = {
    contact_method: channel,
    contact_label: label || channel,
    contact_url: url,
  };

  pushDataLayerEvent('contact_click', payload);
  sendGa4Event('generate_lead', {
    method: channel,
    contact_label: label || channel,
    contact_url: url,
  });

  sendGoogleAdsConversion({
    label: channel === 'whatsapp' ? config.googleAdsWhatsAppLabel : config.googleAdsPhoneLabel,
    customer,
  });

  if (hasMarketingConsent()) {
    const customData = {
      content_name: label || channel,
      contact_method: channel,
      content_type: 'contact',
    };
    sendMetaPixelEvent({
      eventName: 'Contact',
      customData,
      eventId,
    });
    postMetaEvent({
      eventName: 'Contact',
      eventId,
      customer,
      customData,
      eventSourceUrl: url || getPageUrl(),
    });
  }
};

export const trackOrderCompletion = ({ order = {} } = {}) => {
  if (!order?.orderId || hasOrderBeenTracked(order.orderId)) return;
  bootstrapMarketing();

  const items = Array.isArray(order.items) ? order.items : [];
  const analyticsItems = items.map((item) => buildAnalyticsItem(item)).filter((item) => item.item_name);
  const customer = order.customer || {};
  const purpose = order.paymentPurpose || 'purchase';
  const orderValue = purpose === 'trial_setup'
    ? Number(order.paystackChargedAmount || 0)
    : Number(order.total || 0);
  const transactionId = order.orderId;
  const metaEventId = `order-${transactionId}-${purpose}`;
  const metaCustomData = {
    currency: DEFAULT_CURRENCY,
    value: orderValue,
    content_type: 'product',
    content_ids: analyticsItems.map((item) => item.item_id).filter(Boolean),
    contents: buildMetaContents(items),
    num_items: analyticsItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    order_id: transactionId,
  };

  if (purpose === 'purchase') {
    const payload = {
      transaction_id: transactionId,
      currency: DEFAULT_CURRENCY,
      value: orderValue,
      shipping: Number(order.deliveryFee || 0) || 0,
      items: analyticsItems,
    };

    pushDataLayerEvent('purchase', payload);
    sendGa4Event('purchase', payload);
    sendGoogleAdsConversion({
      label: config.googleAdsPurchaseLabel,
      value: orderValue,
      currency: DEFAULT_CURRENCY,
      transactionId,
      customer,
    });

    if (hasMarketingConsent()) {
      sendMetaPixelEvent({
        eventName: 'Purchase',
        customData: metaCustomData,
        eventId: metaEventId,
      });
    }
  } else if (purpose === 'trial_setup') {
    const payload = {
      currency: DEFAULT_CURRENCY,
      value: orderValue,
      items: analyticsItems,
      trial_order_id: transactionId,
    };
    pushDataLayerEvent('start_trial', payload);
    sendGa4Event('start_trial', payload);

    if (hasMarketingConsent()) {
      sendMetaPixelEvent({
        eventName: 'StartTrial',
        customData: metaCustomData,
        eventId: metaEventId,
      });
    }
  } else {
    const payload = {
      value: 0,
      currency: DEFAULT_CURRENCY,
      items: analyticsItems,
      lead_id: transactionId,
    };
    pushDataLayerEvent('generate_lead', payload);
    sendGa4Event('generate_lead', payload);

    if (hasMarketingConsent()) {
      sendMetaPixelEvent({
        eventName: 'Lead',
        customData: metaCustomData,
        eventId: metaEventId,
      });
    }
  }

  markOrderTracked(order.orderId);
};

export const trackServicePurchase = ({ booking = {} } = {}) => {
  if (!booking?.bookingId || hasBookingBeenTracked(booking.bookingId)) return;
  bootstrapMarketing();

  const title = booking.trainingTitle || booking.consultationTitle || booking.bookingId;
  const entityId = booking.trainingId || booking.consultationId || booking.bookingId;
  const customer = booking.customer || {};
  const amount = Number(booking.amount || 0) || 0;
  const item = cleanObject({
    item_id: String(entityId || ''),
    item_name: title,
    item_brand: 'Belle Kreyashon',
    item_category: booking.type === 'training' ? 'Training' : 'Consultation',
    price: amount,
    quantity: 1,
  });
  const transactionId = booking.bookingId;
  const payload = {
    transaction_id: transactionId,
    currency: DEFAULT_CURRENCY,
    value: amount,
    items: [item],
  };

  pushDataLayerEvent('purchase', payload);
  sendGa4Event('purchase', payload);
  sendGoogleAdsConversion({
    label: config.googleAdsPurchaseLabel,
    value: amount,
    currency: DEFAULT_CURRENCY,
    transactionId,
    customer,
  });

  if (hasMarketingConsent()) {
    sendMetaPixelEvent({
      eventName: 'Purchase',
      customData: {
        currency: DEFAULT_CURRENCY,
        value: amount,
        content_type: 'service',
        content_name: title,
        content_category: booking.type || 'booking',
        content_ids: entityId ? [String(entityId)] : [],
        contents: entityId ? [{ id: String(entityId), quantity: 1, item_price: amount }] : [],
        booking_id: transactionId,
      },
      eventId: `booking-${transactionId}`,
    });
  }

  markBookingTracked(transactionId);
};
