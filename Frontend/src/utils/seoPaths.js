export const SITE_URL = String(import.meta.env.VITE_PUBLIC_SITE_URL || 'https://bellekreyashon.com').replace(/\/+$/, '');
const PUBLIC_CONTACT_EMAIL = String(import.meta.env.VITE_PUBLIC_CONTACT_EMAIL || 'bellekreyashon@gmail.com')
  .split(/[;,]/)
  .map((entry) => entry.trim().toLowerCase())
  .find(Boolean) || 'bellekreyashon@gmail.com';

const ensureLeadingSlash = (value = '/') => (
  value.startsWith('/') ? value : `/${value}`
);

export const toAbsoluteUrl = (value = '') => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${ensureLeadingSlash(value)}`;
};

export const getProductPath = (product = {}) => {
  const slugOrId = product?.slug || product?._id || '';
  const collectionPath = product?.isDigital ? '/digital-products' : '/shop';
  return slugOrId ? `${collectionPath}/${slugOrId}` : collectionPath;
};

export const getDigitalCheckoutPath = (product = {}) => {
  const path = getProductPath({ ...product, isDigital: true });
  return product?._id || product?.slug ? `${path}?checkout=1` : '/digital-products';
};

export const getTrainingPath = (training = {}) => {
  const slugOrId = training?.slug || training?._id || '';
  return slugOrId ? `/services/training/${slugOrId}` : '/services';
};

export const getConsultationPath = (consultation = {}) => {
  const slugOrId = consultation?.slug || consultation?._id || '';
  return slugOrId ? `/services/consultation/${slugOrId}` : '/services';
};

export const getPublicItemPath = (kind, item = {}) => {
  if (kind === 'digital-product') return getProductPath({ ...item, isDigital: true });
  if (kind === 'training') return getTrainingPath(item);
  if (kind === 'consultation') return getConsultationPath(item);
  return getProductPath({ ...item, isDigital: false });
};

export const getPublicItemUrl = (kind, item = {}) => toAbsoluteUrl(getPublicItemPath(kind, item));

export const getBlogPath = (post = {}) => {
  const slugOrId = post?.slug || post?._id || '';
  return slugOrId ? `/blog/${slugOrId}` : '/blog';
};

export const buildBreadcrumbSchema = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items
    .filter((item) => item?.name && item?.path)
    .map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
});

export const buildCollectionPageSchema = ({ name, description, path }) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  description,
  url: toAbsoluteUrl(path),
  isPartOf: {
    '@type': 'WebSite',
    name: 'Belle Kreyashon',
    url: SITE_URL,
  },
});

export const buildSiteOrganizationSchema = ({
  name = 'Belle Kreyashon',
  url = SITE_URL,
  logo = '/og-image.svg',
  email = PUBLIC_CONTACT_EMAIL,
} = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name,
  url,
  logo: toAbsoluteUrl(logo),
  email,
  contactPoint: email ? [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email,
    availableLanguage: ['English'],
  }] : undefined,
});

export const buildWebsiteSchema = ({
  name = 'Belle Kreyashon',
  url = SITE_URL,
  searchPath = '/shop?search={search_term_string}',
} = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name,
  url,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${url}${searchPath}`,
    'query-input': 'required name=search_term_string',
  },
});
