import { useEffect, useState } from 'react';
import { getMarketingConfig, getMarketingConsent, onMarketingConsentChange, setMarketingConsent } from '../utils/marketing';

export default function ConsentBanner() {
  const [consent, setConsent] = useState(() => getMarketingConsent());
  const config = getMarketingConfig();
  const hasMarketingTools = Boolean(
    config.gtmId
    || config.ga4Id
    || config.googleAdsId
    || config.metaPixelId
    || config.clarityProjectId
  );

  useEffect(() => onMarketingConsentChange(setConsent), []);

  if (consent || !hasMarketingTools) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9a7a00]">Privacy Choices</p>
            <h2 className="mt-1 text-lg font-extrabold text-black">Allow analytics and ad tracking?</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              We use consent-based analytics, ad measurement, and session insights to understand traffic, improve checkout,
              and reach new buyers more effectively.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setMarketingConsent('denied')}
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-black hover:text-black"
            >
              Only Essential
            </button>
            <button
              type="button"
              onClick={() => setMarketingConsent('granted')}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-gray-900"
            >
              Accept Analytics & Ads
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
