const STORAGE_KEY = 'bk_utm_attribution';
const SESSION_ATTRIBUTION_KEY = 'bk_session_attribution_v1';
const SESSION_ID_KEY = 'bk_analytics_session_v1';
const ATTRIBUTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'ttclid', 'msclkid'];

const canUseStorage = () => typeof window !== 'undefined';

const readJsonStorage = (storage, key) => {
  if (!canUseStorage()) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJsonStorage = (storage, key, value) => {
  if (!canUseStorage()) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const readStoredAttribution = () => {
  if (!canUseStorage()) return null;
  const stored = readJsonStorage(window.localStorage, STORAGE_KEY);
  if (!stored) return null;

  const lastSeen = new Date(stored.lastSeenAt || stored.firstSeenAt || 0).getTime();
  if (lastSeen && Date.now() - lastSeen > ATTRIBUTION_MAX_AGE_MS) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      return null;
    }
    return null;
  }

  return stored;
};

const writeStoredAttribution = (value) => {
  if (!canUseStorage()) return;
  writeJsonStorage(window.localStorage, STORAGE_KEY, value);
};

const readSessionAttribution = () => (
  canUseStorage() ? readJsonStorage(window.sessionStorage, SESSION_ATTRIBUTION_KEY) : null
);

const writeSessionAttribution = (value) => {
  if (!canUseStorage()) return;
  writeJsonStorage(window.sessionStorage, SESSION_ATTRIBUTION_KEY, value);
};

const normalizeSearch = (search = '') => {
  if (!search) return '';
  return search.startsWith('?') ? search : `?${search}`;
};

const pickCampaignValues = (searchParams) => {
  const picked = {};
  [...UTM_KEYS, ...CLICK_ID_KEYS].forEach((key) => {
    const value = searchParams.get(key);
    if (value) picked[key] = value;
  });
  return picked;
};

const mapStoredShape = (source = {}) => ({
  utmSource: source.utm_source || source.utmSource || '',
  utmMedium: source.utm_medium || source.utmMedium || '',
  utmCampaign: source.utm_campaign || source.utmCampaign || '',
  utmTerm: source.utm_term || source.utmTerm || '',
  utmContent: source.utm_content || source.utmContent || '',
  gclid: source.gclid || '',
  fbclid: source.fbclid || '',
  ttclid: source.ttclid || '',
  msclkid: source.msclkid || '',
  landingPage: source.landingPage || '',
  referrer: source.referrer || '',
  firstSeenAt: source.firstSeenAt || '',
  lastSeenAt: source.lastSeenAt || '',
});

const getOrCreateSessionId = () => {
  if (!canUseStorage()) return '';
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const generated = typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
};

export const rememberAttributionFromLocation = (locationLike = {}) => {
  if (!canUseStorage()) return;

  const pathname = locationLike.pathname || window.location.pathname || '';
  const search = normalizeSearch(locationLike.search || window.location.search || '');
  const searchParams = new URLSearchParams(search);
  const campaignValues = pickCampaignValues(searchParams);
  const currentPage = `${pathname}${search}`;
  const now = new Date().toISOString();
  const sessionAttribution = readSessionAttribution();

  if (!sessionAttribution) {
    writeSessionAttribution({
      landingPage: currentPage,
      referrer: document.referrer || '',
      firstSeenAt: now,
    });
  }

  if (!Object.keys(campaignValues).length) return;

  const existing = readStoredAttribution();
  const activeSession = sessionAttribution || readSessionAttribution() || {};
  writeStoredAttribution({
    ...existing,
    ...campaignValues,
    landingPage: activeSession.landingPage || currentPage,
    referrer: activeSession.referrer || document.referrer || '',
    firstSeenAt: existing?.firstSeenAt || now,
    lastSeenAt: now,
  });
};

export const getAttributionSnapshot = (locationLike = {}) => {
  const pathname = locationLike.pathname || (canUseStorage() ? window.location.pathname : '') || '';
  const search = normalizeSearch(locationLike.search || (canUseStorage() ? window.location.search : '') || '');
  const currentPage = `${pathname}${search}`;

  if (canUseStorage()) rememberAttributionFromLocation({ pathname, search });

  const stored = mapStoredShape(readStoredAttribution() || {});
  const sessionAttribution = readSessionAttribution() || {};

  return {
    sourcePage: currentPage,
    sourcePath: pathname,
    sourceQuery: search,
    utmSource: stored.utmSource,
    utmMedium: stored.utmMedium,
    utmCampaign: stored.utmCampaign,
    utmTerm: stored.utmTerm,
    utmContent: stored.utmContent,
    gclid: stored.gclid,
    fbclid: stored.fbclid,
    ttclid: stored.ttclid,
    msclkid: stored.msclkid,
    landingPage: sessionAttribution.landingPage || stored.landingPage || currentPage,
    referrer: sessionAttribution.referrer || stored.referrer,
    sessionId: getOrCreateSessionId(),
    firstSeenAt: sessionAttribution.firstSeenAt || stored.firstSeenAt,
    lastSeenAt: stored.lastSeenAt,
  };
};
