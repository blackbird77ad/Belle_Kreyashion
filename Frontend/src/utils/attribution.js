const STORAGE_KEY = 'bk_utm_attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

const canUseStorage = () => typeof window !== 'undefined';

const readStoredAttribution = () => {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredAttribution = (value) => {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
};

const normalizeSearch = (search = '') => {
  if (!search) return '';
  return search.startsWith('?') ? search : `?${search}`;
};

const pickUtmValues = (searchParams) => {
  const picked = {};
  UTM_KEYS.forEach((key) => {
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
  landingPage: source.landingPage || '',
  firstSeenAt: source.firstSeenAt || '',
  lastSeenAt: source.lastSeenAt || '',
});

export const rememberAttributionFromLocation = (locationLike = {}) => {
  if (!canUseStorage()) return;

  const pathname = locationLike.pathname || window.location.pathname || '';
  const search = normalizeSearch(locationLike.search || window.location.search || '');
  const searchParams = new URLSearchParams(search);
  const utmValues = pickUtmValues(searchParams);
  if (!Object.keys(utmValues).length) return;

  const currentPage = `${pathname}${search}`;
  const existing = readStoredAttribution();
  const now = new Date().toISOString();

  writeStoredAttribution({
    ...existing,
    ...utmValues,
    landingPage: existing?.landingPage || currentPage,
    firstSeenAt: existing?.firstSeenAt || now,
    lastSeenAt: now,
  });
};

export const getAttributionSnapshot = (locationLike = {}) => {
  const pathname = locationLike.pathname || (canUseStorage() ? window.location.pathname : '') || '';
  const search = normalizeSearch(locationLike.search || (canUseStorage() ? window.location.search : '') || '');
  const currentPage = `${pathname}${search}`;

  if (canUseStorage()) {
    rememberAttributionFromLocation({ pathname, search });
  }

  const stored = mapStoredShape(readStoredAttribution() || {});

  return {
    sourcePage: currentPage,
    sourcePath: pathname,
    sourceQuery: search,
    utmSource: stored.utmSource,
    utmMedium: stored.utmMedium,
    utmCampaign: stored.utmCampaign,
    utmTerm: stored.utmTerm,
    utmContent: stored.utmContent,
    landingPage: stored.landingPage,
    firstSeenAt: stored.firstSeenAt,
    lastSeenAt: stored.lastSeenAt,
  };
};
