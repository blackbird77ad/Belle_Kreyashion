import { useEffect } from 'react';
import { buildSiteOrganizationSchema, buildWebsiteSchema, toAbsoluteUrl } from '../utils/seoPaths';

const SITE = 'Belle Kreyashon';
const BASE_URL = 'https://bellekreyashon.com';
const DEFAULT_IMAGE = toAbsoluteUrl('/og-image.svg');
const DEFAULT_KEYWORDS = 'Belle Kreyashon, hair extensions Ghana, wigs Ghana, beauty products Ghana, digital courses Ghana, training Ghana, online shopping Ghana, Accra beauty store, lifestyle products Ghana';

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
  keywords = '',
  schema = null,
  publishedTime = '',
  modifiedTime = '',
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : `${SITE} | Hair, Beauty & Lifestyle Store Ghana`;
    document.title = fullTitle;

    const set = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        const tagName = selector.startsWith('link') ? 'link' : 'meta';
        el = document.createElement(tagName);
        const parts = selector.match(/\[(.+?)="(.+?)"\]/);
        if (parts) el.setAttribute(parts[1], parts[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value || '');
    };

    const remove = (selector) => {
      const el = document.querySelector(selector);
      if (el) el.remove();
    };

    const desc = description || 'Hair extensions, wigs, braiding hair, beauty, skincare, fashion and more. Nationwide delivery across Ghana and international shipping.';
    const pageUrl = toAbsoluteUrl(url || '/');
    const pageImg = toAbsoluteUrl(image || DEFAULT_IMAGE);

    set('meta[name="description"]', 'content', desc);
    set('meta[name="keywords"]', 'content', keywords || DEFAULT_KEYWORDS);
    set('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow');
    set('meta[name="googlebot"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    set('link[rel="canonical"]', 'href', pageUrl);

    set('meta[property="og:site_name"]', 'content', SITE);
    set('meta[property="og:title"]', 'content', fullTitle);
    set('meta[property="og:description"]', 'content', desc);
    set('meta[property="og:url"]', 'content', pageUrl);
    set('meta[property="og:type"]', 'content', type);
    set('meta[property="og:image"]', 'content', pageImg);
    set('meta[property="og:image:secure_url"]', 'content', pageImg);
    set('meta[property="og:image:alt"]', 'content', title || SITE);

    set('meta[name="twitter:card"]', 'content', 'summary_large_image');
    set('meta[name="twitter:title"]', 'content', fullTitle);
    set('meta[name="twitter:description"]', 'content', desc);
    set('meta[name="twitter:url"]', 'content', pageUrl);
    set('meta[name="twitter:image"]', 'content', pageImg);
    set('meta[name="twitter:image:alt"]', 'content', title || SITE);

    if (publishedTime) set('meta[property="article:published_time"]', 'content', publishedTime);
    else remove('meta[property="article:published_time"]');

    if (modifiedTime) set('meta[property="article:modified_time"]', 'content', modifiedTime);
    else remove('meta[property="article:modified_time"]');

    let schemaTag = document.querySelector('script[data-seo-schema="true"]');
    if (!schemaTag) {
      schemaTag = document.createElement('script');
      schemaTag.type = 'application/ld+json';
      schemaTag.dataset.seoSchema = 'true';
      document.head.appendChild(schemaTag);
    }
    const pageSchemas = Array.isArray(schema) ? schema.filter(Boolean) : schema ? [schema] : [];
    const schemaPayload = [
      buildSiteOrganizationSchema(),
      buildWebsiteSchema(),
      ...pageSchemas,
    ].filter(Boolean);
    schemaTag.textContent = schemaPayload ? JSON.stringify(schemaPayload) : '';
  }, [title, description, image, url, type, noindex, keywords, schema, publishedTime, modifiedTime]);

  return null;
}
