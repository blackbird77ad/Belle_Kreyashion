import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Copy, Megaphone } from 'lucide-react';
import { getMarketingConfig } from '../utils/marketing';

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all';
const formatMoney = (value = 0) => `GHS ${Number(value || 0).toLocaleString()}`;
const ADS_PANEL_OPTIONS = [
  { key: 'setup', label: 'Tracking Setup' },
  { key: 'links', label: 'Campaign Link Builder' },
  { key: 'performance', label: 'Campaign Performance' },
  { key: 'intent', label: 'Product Intent' },
  { key: 'conversions', label: 'Conversions & Activity' },
];

const maskTrackingId = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return clean.length > 9 ? `${clean.slice(0, 5)}...${clean.slice(-4)}` : clean;
};

export default function AdminAdsDashboard({ analytics = {}, setup = {}, onRefresh, initialDestination = '' }) {
  const config = getMarketingConfig();
  const funnel = analytics.marketingFunnel || {};
  const summary = funnel.summary || {};
  const campaigns = funnel.campaigns || [];
  const productInterest = funnel.productInterest || [];
  const landingPages = funnel.landingPages || [];
  const recentConversions = funnel.recentConversions || [];
  const recentActivity = funnel.recentActivity || [];
  const [linkForm, setLinkForm] = useState({
    destination: initialDestination || 'https://bellekreyashon.com/shop',
    source: 'facebook',
    medium: 'paid_social',
    campaign: '',
    content: '',
    term: '',
  });
  const [copyMessage, setCopyMessage] = useState('');
  const [activePanel, setActivePanel] = useState(initialDestination ? 'links' : '');

  const updateLinkField = (key, value) => setLinkForm((current) => ({ ...current, [key]: value }));
  const campaignUrl = (() => {
    try {
      const url = new URL(linkForm.destination || '/shop', 'https://bellekreyashon.com');
      const values = {
        utm_source: linkForm.source,
        utm_medium: linkForm.medium,
        utm_campaign: linkForm.campaign,
        utm_content: linkForm.content,
        utm_term: linkForm.term,
      };
      Object.entries(values).forEach(([key, value]) => {
        if (String(value || '').trim()) url.searchParams.set(key, String(value).trim());
      });
      return url.toString();
    } catch {
      return '';
    }
  })();

  const copyCampaignUrl = async () => {
    if (!campaignUrl) return;
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopyMessage('Campaign link copied');
      setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage('Copy failed');
    }
  };

  const browserIntegrations = [
    { key: 'first-party', label: 'First-party activity ledger', configured: true, detail: 'Anonymous consented sessions and ecommerce funnel events' },
    { key: 'gtm', label: 'Google Tag Manager', configured: Boolean(config.gtmId), detail: config.gtmId ? maskTrackingId(config.gtmId) : 'Add VITE_GTM_ID' },
    { key: 'ga4', label: 'Google Analytics 4', configured: Boolean(config.ga4Id || config.gtmId), detail: config.ga4Id ? maskTrackingId(config.ga4Id) : config.gtmId ? 'Expected through GTM; verify in GTM Preview' : 'Add VITE_GA4_ID' },
    { key: 'google-ads', label: 'Google Ads + enhanced conversions', configured: Boolean(config.googleAdsId && config.googleAdsPurchaseLabel), detail: config.googleAdsId ? `${maskTrackingId(config.googleAdsId)}${config.googleAdsPurchaseLabel ? '' : ' / purchase label missing'}` : 'Add Google Ads ID and conversion labels' },
    { key: 'meta', label: 'Meta Pixel', configured: Boolean(config.metaPixelId), detail: config.metaPixelId ? maskTrackingId(config.metaPixelId) : 'Add VITE_META_PIXEL_ID' },
    { key: 'tiktok', label: 'TikTok Pixel', configured: Boolean(config.tiktokPixelId), detail: config.tiktokPixelId ? maskTrackingId(config.tiktokPixelId) : 'Optional: add VITE_TIKTOK_PIXEL_ID' },
  ];
  const integrationRows = [...browserIntegrations, ...(setup.serverIntegrations || [])];
  const configuredCount = integrationRows.filter((item) => item.configured).length;
  const eventHealth = setup.eventHealth || [];

  return (
    <div className="space-y-5 mb-5">
      <div className="overflow-hidden rounded-[30px] bg-black p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FDC700]">
              <Megaphone size={13} /> Ads Control Room
            </div>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">Track the full path from ad click to verified revenue</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Browser pixels, server events, UTM campaigns, product intent, contact leads, checkout activity, and completed orders in one place.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Integrations Ready</p>
              <p className="mt-1 text-2xl font-extrabold">{configuredCount}/{integrationRows.length}</p>
            </div>
            <button type="button" onClick={onRefresh} className="rounded-2xl bg-[#FDC700] px-4 py-3 text-sm font-extrabold text-black">
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Tracked Visits', value: summary.visits || 0, hint: 'Unique consented sessions' },
          { label: 'Product Viewers', value: summary.productViews || 0, hint: 'Opened product pages' },
          { label: 'Cart Sessions', value: summary.addToCarts || 0, hint: 'Added at least one item' },
          { label: 'Checkout Sessions', value: summary.checkouts || 0, hint: 'Started checkout' },
          { label: 'Lead Sessions', value: (summary.contacts || 0) + (summary.formSubmissions || 0), hint: 'Contact clicks and forms' },
          { label: 'Conversion Value', value: formatMoney(summary.revenue), hint: `${summary.purchases || 0} completed orders` },
        ].map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{metric.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-black">{metric.value}</p>
            <p className="mt-1 text-xs text-gray-500">{metric.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Ads Workspace</p>
            <h3 className="mt-1 text-lg font-extrabold">Open one ads tool at a time</h3>
            <p className="mt-1 text-xs text-gray-500">Tracking details and reports remain closed until you select them.</p>
          </div>
          <select
            value={activePanel}
            onChange={(event) => setActivePanel(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-black xl:hidden"
          >
            <option value="">Choose an ads section</option>
            {ADS_PANEL_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <div className="hidden flex-wrap gap-2 xl:flex">
            {ADS_PANEL_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActivePanel((current) => current === option.key ? '' : option.key)}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${activePanel === option.key ? 'bg-black text-white' : 'border border-gray-200 bg-[#fcfbf7] text-gray-600 hover:border-black hover:text-black'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activePanel === 'setup' && (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Tracking Setup</p><h3 className="mt-1 text-lg font-extrabold">Pixels, tags, and server connections</h3></div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">No secrets shown</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {integrationRows.map((integration) => (
              <div key={integration.key} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                <div className="flex items-start gap-2">
                  {integration.configured ? <CheckCircle size={17} className="mt-0.5 shrink-0 text-green-600" /> : <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-500" />}
                  <div className="min-w-0"><p className="text-sm font-extrabold text-black">{integration.label}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{integration.detail}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Event Health</p><h3 className="mt-1 text-lg font-extrabold">Events received in the last 7 days</h3></div>
          <div className="space-y-2">
            {eventHealth.map((event) => (
              <div key={event.key} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#fcfbf7] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2"><Activity size={15} className={event.count7d > 0 ? 'text-green-600' : 'text-gray-300'} /><div className="min-w-0"><p className="text-sm font-bold text-black">{event.label}</p><p className="truncate text-[10px] text-gray-400">{event.lastReceivedAt ? `Last ${new Date(event.lastReceivedAt).toLocaleString('en-GB')}` : 'Waiting for first event'}</p></div></div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-black">{event.count7d || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activePanel === 'links' && (
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Campaign Link Builder</p><h3 className="mt-1 text-lg font-extrabold">Create a traceable URL before launching each ad</h3><p className="mt-1 text-xs text-gray-500">Use a unique campaign and content name for every ad set or creative.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input value={linkForm.destination} onChange={(event) => updateLinkField('destination', event.target.value)} placeholder="Destination URL" className={inputClass} />
          <input value={linkForm.source} onChange={(event) => updateLinkField('source', event.target.value)} placeholder="Source: facebook, google, tiktok" className={inputClass} />
          <input value={linkForm.medium} onChange={(event) => updateLinkField('medium', event.target.value)} placeholder="Medium: paid_social, cpc" className={inputClass} />
          <input value={linkForm.campaign} onChange={(event) => updateLinkField('campaign', event.target.value)} placeholder="Campaign name" className={inputClass} />
          <input value={linkForm.content} onChange={(event) => updateLinkField('content', event.target.value)} placeholder="Creative / ad name" className={inputClass} />
          <input value={linkForm.term} onChange={(event) => updateLinkField('term', event.target.value)} placeholder="Keyword or audience (optional)" className={inputClass} />
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-black p-3 text-white sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 break-all text-xs text-gray-300">{campaignUrl || 'Enter a valid destination URL.'}</p>
          <button type="button" onClick={copyCampaignUrl} disabled={!campaignUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FDC700] px-4 py-2 text-xs font-extrabold text-black disabled:opacity-50"><Copy size={13} /> {copyMessage || 'Copy URL'}</button>
        </div>
      </div>
      )}

      {activePanel === 'performance' && (
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Campaign Performance</p><h3 className="mt-1 text-lg font-extrabold">Visitor source, intent, orders, and conversion value</h3></div>
        {campaigns.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-200 bg-[#fcfbf7] p-5 text-center text-sm text-gray-500">No campaign activity recorded yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs">
            <thead><tr className="border-b border-gray-200 text-[10px] uppercase tracking-[0.12em] text-gray-400"><th className="pb-3 pr-4">Source / Campaign</th><th className="px-2 pb-3 text-right">Visits</th><th className="px-2 pb-3 text-right">Viewed</th><th className="px-2 pb-3 text-right">Cart</th><th className="px-2 pb-3 text-right">Checkout</th><th className="px-2 pb-3 text-right">Leads</th><th className="px-2 pb-3 text-right">Orders</th><th className="px-2 pb-3 text-right">Rate</th><th className="pb-3 pl-2 text-right">Value</th></tr></thead>
            <tbody>{campaigns.map((campaign) => <tr key={campaign.key} className="border-b border-gray-100 last:border-0"><td className="py-3 pr-4"><p className="font-extrabold text-sm text-black">{campaign.label}</p><p className="mt-0.5 text-[11px] text-gray-500">{campaign.description}</p></td><td className="px-2 py-3 text-right font-bold">{campaign.visits || 0}</td><td className="px-2 py-3 text-right font-bold">{campaign.productViews || 0}</td><td className="px-2 py-3 text-right font-bold">{campaign.addToCarts || 0}</td><td className="px-2 py-3 text-right font-bold">{campaign.checkouts || 0}</td><td className="px-2 py-3 text-right font-bold">{(campaign.contacts || 0) + (campaign.forms || 0)}</td><td className="px-2 py-3 text-right font-extrabold">{campaign.purchases || 0}</td><td className="px-2 py-3 text-right font-extrabold">{campaign.conversionRate || 0}%</td><td className="py-3 pl-2 text-right font-extrabold">{formatMoney(campaign.revenue)}</td></tr>)}</tbody>
          </table></div>
        )}
      </div>
      )}

      {activePanel === 'intent' && (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Product Intent</p><h3 className="mt-1 text-lg font-extrabold">Products viewed, carted, and taken to checkout</h3></div>
          <div className="space-y-2">{productInterest.length === 0 && <p className="text-sm text-gray-500">No product activity yet.</p>}{productInterest.map((product) => <div key={product.key} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-black">{product.name}</p><p className="text-xs text-gray-500">{product.category || (product.isDigital ? 'Digital product' : 'Shop product')}</p></div><div className="grid shrink-0 grid-cols-3 gap-3 text-right text-[11px]"><div><p className="text-gray-400">Views</p><p className="font-extrabold">{product.views || 0}</p></div><div><p className="text-gray-400">Carts</p><p className="font-extrabold">{product.addToCarts || 0}</p></div><div><p className="text-gray-400">Checkout</p><p className="font-extrabold">{product.checkouts || 0}</p></div></div></div>)}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Landing Pages</p><h3 className="mt-1 text-lg font-extrabold">Where ad visitors first arrived</h3></div>
          <div className="space-y-2">{landingPages.length === 0 && <p className="text-sm text-gray-500">No landing-page activity yet.</p>}{landingPages.map((page) => <div key={page.path} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-all text-sm font-extrabold text-black">{page.path}</p><span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">{page.visits} visits</span></div><p className="mt-1 text-xs text-gray-500">{page.campaigns.join(', ')}</p></div>)}</div>
        </div>
      </div>
      )}

      {activePanel === 'conversions' && (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Verified Conversions</p><h3 className="mt-1 text-lg font-extrabold">Recent order source and value</h3></div>
          <div className="space-y-2">{recentConversions.length === 0 && <p className="text-sm text-gray-500">No completed orders in this period.</p>}{recentConversions.map((conversion) => <div key={conversion.id} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-extrabold text-black">{conversion.orderId}</p><p className="mt-0.5 truncate text-xs text-gray-600">{conversion.products.join(', ') || 'Order'}</p><p className="mt-1 text-[11px] text-gray-400">{conversion.campaign} / {new Date(conversion.createdAt).toLocaleString('en-GB')}</p></div><p className="shrink-0 text-sm font-extrabold text-black">{formatMoney(conversion.value)}</p></div></div>)}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Live Activity</p><h3 className="mt-1 text-lg font-extrabold">Latest anonymous customer actions</h3></div>
          <div className="space-y-2">{recentActivity.length === 0 && <p className="text-sm text-gray-500">No visitor activity yet.</p>}{recentActivity.map((activity) => <div key={activity.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3"><div className="min-w-0"><p className="text-sm font-extrabold text-black">{activity.label}</p><p className="truncate text-xs text-gray-600">{activity.detail}</p><p className="mt-1 text-[11px] text-gray-400">{activity.campaign}{activity.pagePath ? ` / ${activity.pagePath}` : ''}</p></div><p className="shrink-0 text-[10px] text-gray-400">{new Date(activity.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>)}</div>
        </div>
      </div>
      )}

      {activePanel && <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
        <strong>Scope:</strong> this tab manages measurement, campaign URLs, and attribution. Creating or editing paid campaigns still happens in Meta Ads Manager, Google Ads, or TikTok Ads Manager unless their separate campaign-management APIs are connected.
      </div>}
    </div>
  );
}
