const SITE_URL = 'https://bellekreyashon.com';

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
  return slugOrId ? `/shop/${slugOrId}` : '/shop';
};

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
