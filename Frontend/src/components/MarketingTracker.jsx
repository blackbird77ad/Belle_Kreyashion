import { useEffect, useEffectEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { bootstrapMarketing, trackContactClick, trackPageView } from '../utils/marketing';

const isWhatsAppUrl = (href = '') => /wa\.me|api\.whatsapp\.com/i.test(href);

const isPhoneUrl = (href = '') => href.startsWith('tel:');

export default function MarketingTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    bootstrapMarketing();
  }, []);

  useEffect(() => {
    trackPageView({ pathname, search });
  }, [pathname, search]);

  const handleDocumentClick = useEffectEvent((event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    const href = anchor?.getAttribute('href') || '';
    if (!href) return;

    if (isWhatsAppUrl(href)) {
      trackContactClick({
        channel: 'whatsapp',
        label: anchor.textContent?.trim() || 'WhatsApp link',
        url: href,
      });
      return;
    }

    if (isPhoneUrl(href)) {
      trackContactClick({
        channel: 'phone',
        label: anchor.textContent?.trim() || 'Phone link',
        url: href,
      });
    }
  });

  useEffect(() => {
    const listener = (event) => handleDocumentClick(event);
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
  }, []);

  return null;
}
