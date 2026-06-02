const DEFAULT_SITE_URL = 'https://bellekreyashon.com';
const DEFAULT_CONTACT_EMAIL = 'bellekreyashon@gmail.com';

const stripHtml = (value = '') => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeXml = (value = '') => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const truncate = (value = '', maxLength = 5000) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const roundMoney = (value) => Math.max(0, Math.round(Number(value) || 0));

const isDiscountLive = (product = {}) => {
  const discount = product?.discount;
  if (!discount?.active) return false;
  const now = new Date();
  if (discount.startDate && new Date(discount.startDate) > now) return false;
  if (discount.endDate && new Date(discount.endDate) < now) return false;
  if (discount.limitCustomers && (discount.usedCount || 0) >= discount.limitCustomers) return false;
  return true;
};

const applyDiscountToAmount = (amount, discount) => {
  if (!discount?.active) return roundMoney(amount);
  if (discount.type === 'percent') return Math.max(0, roundMoney(amount * (1 - discount.value / 100)));
  return Math.max(0, roundMoney(amount - discount.value));
};

export const resolveMerchantSiteUrl = () => (
  String(process.env.SITE_URL || process.env.FRONTEND_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '')
);

const normalizeSingleEmail = (value = '') => String(value || '')
  .split(/[;,]/)
  .map((entry) => entry.trim().toLowerCase())
  .find(Boolean) || '';

export const resolveMerchantContactEmail = () => (
  normalizeSingleEmail(process.env.PUBLIC_CONTACT_EMAIL || process.env.CONTACT_TO_EMAIL || DEFAULT_CONTACT_EMAIL)
);

export const toMerchantAbsoluteUrl = (value = '') => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const siteUrl = resolveMerchantSiteUrl();
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const toMerchantPrice = (amount) => `${(Number(amount || 0)).toFixed(2)} GHS`;

const resolveProductDescription = (product = {}) => {
  const raw = stripHtml(product.desc || '');
  if (raw) return truncate(raw, 4900);
  return truncate(
    `${product.name || 'Product'} from Belle Kreyashon. Shop hair, beauty, and lifestyle products with pickup, delivery, and international support.`,
    4900
  );
};

const resolveMerchantAvailability = (product = {}) => {
  if (product.isPreOrder) return 'preorder';
  if (Number(product.stock) === 0) return 'out_of_stock';
  return 'in_stock';
};

const resolveProductPrice = (product = {}) => {
  const basePrice = roundMoney(product.retailPrice);
  if (!isDiscountLive(product)) {
    return {
      price: toMerchantPrice(basePrice),
      salePrice: '',
      currentAmount: basePrice,
    };
  }

  const discountedPrice = applyDiscountToAmount(basePrice, product.discount);
  if (discountedPrice >= basePrice) {
    return {
      price: toMerchantPrice(basePrice),
      salePrice: '',
      currentAmount: basePrice,
    };
  }

  return {
    price: toMerchantPrice(basePrice),
    salePrice: toMerchantPrice(discountedPrice),
    currentAmount: discountedPrice,
  };
};

const resolveBrand = (product = {}) => (
  String(product.partnerBrand || product.brand || 'Belle Kreyashon').trim() || 'Belle Kreyashon'
);

const resolveProductLink = (product = {}) => {
  const slugOrId = product.slug || product._id || '';
  return slugOrId ? toMerchantAbsoluteUrl(`/shop/${slugOrId}`) : '';
};

const resolveImageLink = (product = {}) => {
  const image = Array.isArray(product.images) ? product.images.find(Boolean) : '';
  return image ? toMerchantAbsoluteUrl(image) : '';
};

export const isMerchantFeedEligible = (product = {}) => {
  if (!product || product.available === false || product.isDigital) return false;
  if (!product.slug && !product._id) return false;
  if (!resolveImageLink(product)) return false;
  return roundMoney(product.retailPrice) > 0;
};

export const buildMerchantFeedItem = (product = {}) => {
  if (!isMerchantFeedEligible(product)) return null;

  const pricing = resolveProductPrice(product);

  return {
    id: String(product.slug || product._id || ''),
    title: truncate(String(product.name || 'Belle Kreyashon product').trim(), 150),
    description: resolveProductDescription(product),
    link: resolveProductLink(product),
    imageLink: resolveImageLink(product),
    availability: resolveMerchantAvailability(product),
    price: pricing.price,
    salePrice: pricing.salePrice,
    brand: resolveBrand(product),
    condition: 'new',
    productType: String(product.category || 'General').trim() || 'General',
    customLabel0: product.featured ? 'featured' : 'standard',
    customLabel1: product.isPartner ? 'partner' : 'owned',
    customLabel2: product.isPreOrder ? 'preorder' : 'ready-to-ship',
  };
};

export const buildGoogleMerchantFeedXml = (products = []) => {
  const siteUrl = resolveMerchantSiteUrl();
  const contactEmail = resolveMerchantContactEmail();
  const items = products
    .map((product) => buildMerchantFeedItem(product))
    .filter(Boolean);

  const itemXml = items.map((item) => [
    '    <item>',
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <title>${escapeXml(item.title)}</title>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
    `      <g:availability>${escapeXml(item.availability)}</g:availability>`,
    `      <g:price>${escapeXml(item.price)}</g:price>`,
    item.salePrice ? `      <g:sale_price>${escapeXml(item.salePrice)}</g:sale_price>` : '',
    `      <g:condition>${escapeXml(item.condition)}</g:condition>`,
    `      <g:brand>${escapeXml(item.brand)}</g:brand>`,
    '      <g:identifier_exists>false</g:identifier_exists>',
    `      <g:product_type>${escapeXml(item.productType)}</g:product_type>`,
    `      <g:custom_label_0>${escapeXml(item.customLabel0)}</g:custom_label_0>`,
    `      <g:custom_label_1>${escapeXml(item.customLabel1)}</g:custom_label_1>`,
    `      <g:custom_label_2>${escapeXml(item.customLabel2)}</g:custom_label_2>`,
    '    </item>',
  ].filter(Boolean).join('\n')).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    '    <title>Belle Kreyashon Product Feed</title>',
    `    <link>${escapeXml(siteUrl)}</link>`,
    '    <description>Physical product feed for Google Merchant Center free listings and product discovery.</description>',
    `    <managingEditor>${escapeXml(contactEmail)}</managingEditor>`,
    itemXml,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
};
