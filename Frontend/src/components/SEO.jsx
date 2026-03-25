import { useEffect } from 'react';

const SITE = 'Belle Kreyashon';
const BASE_URL = 'https://bellekreyashon.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}) {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} | ${SITE}` : `${SITE} | Hair, Beauty & Lifestyle Store Ghana`;
    document.title = fullTitle;

    const set = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const parts = selector.match(/\[(.+?)="(.+?)"\]/);
        if (parts) el.setAttribute(parts[1], parts[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value || '');
    };

    const desc = description || 'Hair extensions, wigs, braiding hair, beauty, skincare, fashion and more. Nationwide delivery across Ghana and international shipping.';
    const pageUrl  = url  ? `${BASE_URL}${url}` : BASE_URL;
    const pageImg  = image || DEFAULT_IMAGE;

    // Standard
    set('meta[name="description"]',         'content', desc);
    set('meta[name="robots"]',              'content', noindex ? 'noindex, nofollow' : 'index, follow');
    set('link[rel="canonical"]',            'href',    pageUrl);

    // OG
    set('meta[property="og:title"]',        'content', fullTitle);
    set('meta[property="og:description"]',  'content', desc);
    set('meta[property="og:url"]',          'content', pageUrl);
    set('meta[property="og:type"]',         'content', type);
    set('meta[property="og:image"]',        'content', pageImg);

    // Twitter
    set('meta[name="twitter:title"]',       'content', fullTitle);
    set('meta[name="twitter:description"]', 'content', desc);
    set('meta[name="twitter:image"]',       'content', pageImg);
  }, [title, description, image, url, type, noindex]);

  return null;
}