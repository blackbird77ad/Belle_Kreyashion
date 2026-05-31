import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Phone,
  PlayCircle,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { generateCertificate } from '../utils/generateCertificate';

const fileIcon = (kind) => {
  if (kind === 'video') return <PlayCircle size={16} />;
  if (kind === 'image') return <ImageIcon size={16} />;
  return <FileText size={16} />;
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const validateEmail = (raw = '') => {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return 'Enter the email address where your certificate should be sent.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return 'Enter a valid email address.';
  return null;
};

const validatePhone = (raw = '') => {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Enter the learner phone or WhatsApp number.';
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number can only contain digits and an optional + sign.';
  if (cleaned.startsWith('0') && cleaned.length !== 10) return 'Ghana phone numbers should be 10 digits.';
  if ((cleaned.startsWith('+233') || cleaned.startsWith('233')) && cleaned.replace(/^\+/, '').length !== 12) {
    return 'Ghana numbers with country code should be 12 digits.';
  }
  if (cleaned.startsWith('+') && (cleaned.length < 8 || cleaned.length > 16)) {
    return 'International numbers should include a valid country code.';
  }
  return null;
};

const normalizePhone = (raw = '') => {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};

const LIBRARY_FILTERS = [
  { key: 'all', label: 'All Access' },
  { key: 'paid', label: 'Paid' },
  { key: 'trial', label: 'Trial' },
  { key: 'free', label: 'Free' },
  { key: 'certified', label: 'Certified' },
];

const buildSecureViewerUrl = (file, url) => {
  if (!url) return '';
  const isPdf = String(file?.mimeType || '').includes('pdf')
    || String(file?.originalFilename || '').toLowerCase().endsWith('.pdf');
  return isPdf ? `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` : url;
};

const normalizeSupportWhatsApp = (value = '') => {
  const cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.slice(1)}`;
  return cleaned;
};

const buildSupportEmailLink = (email = '', productName = '') => {
  if (!email) return '';
  const subject = encodeURIComponent(`Support needed for ${productName || 'digital training'}`);
  const body = encodeURIComponent(`Hello trainer,\n\nI need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.\n\nThank you.`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const buildSupportWhatsAppLink = (phone = '', productName = '') => {
  const normalized = normalizeSupportWhatsApp(phone);
  if (!normalized) return '';
  const text = encodeURIComponent(`Hello trainer, I need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.`);
  return `https://wa.me/${normalized}?text=${text}`;
};

export default function DigitalLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { customer } = useCustomer();
  const { removeOwnedDigitalItems } = useCart();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState('');
  const [actioning, setActioning] = useState('');
  const [error, setError] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [viewer, setViewer] = useState(null);
  const [certificateTarget, setCertificateTarget] = useState(null);
  const [certificateForm, setCertificateForm] = useState({
    learnerName: '',
    learnerEmail: '',
    learnerPhone: '',
    notes: '',
  });
  const [certificateFormError, setCertificateFormError] = useState('');

  const loadLibrary = useCallback(async (showLoader = true) => {
    if (!customer?.accessToken) {
      setLibrary([]);
      if (showLoader) setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/products/digital/library', {
        headers: { 'x-customer-token': customer.accessToken },
      });
      setLibrary(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your digital library right now.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    loadLibrary(true);
  }, [loadLibrary]);

  useEffect(() => {
    const ownedProductIds = library.map((item) => item.productId).filter(Boolean);
    if (!ownedProductIds.length) return;
    removeOwnedDigitalItems(ownedProductIds);
  }, [library]);

  const filteredLibrary = library.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      item.productName,
      item.productDesc,
      item.seriesTitle,
      ...(item.files || []).map((file) => `${file.label || ''} ${file.stepTitle || ''} ${file.stepSummary || ''}`),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);

    const matchesFilter = libraryFilter === 'all'
      || (libraryFilter === 'paid' && item.digitalAccessKind === 'paid')
      || (libraryFilter === 'trial' && item.digitalAccessKind === 'trial')
      || (libraryFilter === 'free' && item.digitalAccessKind === 'free')
      || (libraryFilter === 'certified' && item.isCertified);

    return matchesSearch && matchesFilter;
  });
  const focusedProductId = searchParams.get('product') || '';
  const visibleLibrary = [...filteredLibrary].sort((a, b) => {
    const aFocused = focusedProductId && String(a.productId) === focusedProductId ? 1 : 0;
    const bFocused = focusedProductId && String(b.productId) === focusedProductId ? 1 : 0;
    return bFocused - aFocused;
  });

  const openAsset = async (grantId, assetId, mode = 'inline') => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${assetId}-${mode}`;
    setOpening(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/assets/${assetId}`,
        { mode },
        { headers: { 'x-customer-token': customer.accessToken } }
      );

      if (mode === 'inline') {
        const libraryItem = library.find((item) => item._id === grantId);
        const file = libraryItem?.files?.find((entry) => entry.assetId === assetId);
        if (file) {
          setViewer({
            grantId,
            assetId,
            productName: libraryItem?.productName || 'Digital Product',
            customerName: libraryItem?.customerName || customer?.name || 'Belle Kreyashon customer',
            customerEmail: libraryItem?.customerEmail || customer?.email || '',
            supportEmail: libraryItem?.supportEmail || '',
            supportWhatsApp: libraryItem?.supportWhatsApp || '',
            file,
            url: buildSecureViewerUrl(file, data.url),
          });
        } else {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => loadLibrary(false), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open this file right now.');
    } finally {
      setOpening('');
    }
  };

  const markModuleComplete = async (grantId, assetId) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${assetId}-complete`;
    setActioning(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/assets/${assetId}/complete`,
        {},
        { headers: { 'x-customer-token': customer.accessToken } }
      );

      setLibrary((current) => current.map((item) => {
        if (item._id !== grantId) return item;
        return {
          ...item,
          certificateStatus: data.certificateStatus || item.certificateStatus,
          progress: data.progress || item.progress,
          files: (item.files || []).map((file) => (
            file.assetId === assetId
              ? { ...file, isCompleted: true }
              : file
          )),
        };
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark this module as complete right now.');
    } finally {
      setActioning('');
    }
  };

  const openCertificateRequest = (item) => {
    setCertificateFormError('');
    setCertificateTarget(item);
    setCertificateForm({
      learnerName: item?.customerName || customer?.name || '',
      learnerEmail: item?.customerEmail || customer?.email || '',
      learnerPhone: item?.customerPhone || customer?.phone || '',
      notes: '',
    });
  };

  const requestCertificate = async (grantId, payload) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-certificate`;
    setActioning(actionKey);
    setError('');

    try {
      await api.post(
        `/api/products/digital/library/${grantId}/certificate-request`,
        payload,
        { headers: { 'x-customer-token': customer.accessToken } }
      );

      setLibrary((current) => current.map((item) => (
        item._id === grantId
          ? { ...item, certificateStatus: 'requested', certificateRequestedAt: new Date().toISOString() }
          : item
      )));
      setCertificateTarget(null);
      setCertificateFormError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not request the certificate right now.';
      setCertificateFormError(message);
      setError(message);
    } finally {
      setActioning('');
    }
  };

  const submitCertificateRequest = async () => {
    if (!certificateTarget?._id) return;

    const learnerName = certificateForm.learnerName.trim();
    const learnerEmail = certificateForm.learnerEmail.trim().toLowerCase();
    const learnerPhone = normalizePhone(certificateForm.learnerPhone.trim());
    const notes = certificateForm.notes.trim();

    if (!learnerName) {
      setCertificateFormError('Enter the full name exactly as it should appear on the certificate.');
      return;
    }

    const emailError = validateEmail(learnerEmail);
    if (emailError) {
      setCertificateFormError(emailError);
      return;
    }

    const phoneError = validatePhone(learnerPhone);
    if (phoneError) {
      setCertificateFormError(phoneError);
      return;
    }

    setCertificateFormError('');
    setError('');
    await requestCertificate(certificateTarget._id, {
      learnerName,
      learnerEmail,
      learnerPhone,
      notes,
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <SEO
        title="Digital Library"
        description="Access your Belle Kreyashon digital products, free claims, trial access, files and protected learning materials."
        url="/digital-library"
        noindex
      />

      <div className="bg-black text-white py-14 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Protected Access</p>
        <h1 className="text-3xl md:text-4xl font-extrabold">My Digital Library</h1>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
          Free, trial and paid digital products stay behind secure access links. Open every module, complete your learning path, and request certificate review here when you are ready.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-gray-100 p-5 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfbf7] px-3 py-1.5 text-xs font-bold text-gray-600">
                <ShieldCheck size={14} className="text-[#FDC700]" />
                Secure customer-only access
              </div>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                Access links are issued temporarily and approved on up to two devices for the paying customer to reduce casual sharing.
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
            >
              View Orders
            </Link>
          </div>
        </div>

        {!customer?.accessToken && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#fcfbf7] mx-auto mb-4 flex items-center justify-center text-[#FDC700]">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-extrabold mb-2">Reconnect As The Purchasing Customer</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
              Use the same customer details you used when checking out so we can load your protected digital purchases.
            </p>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-900"
            >
              Continue As Customer
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-16 text-center">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-[#FDC700]" />
            <p className="font-bold text-gray-600">Loading your digital products...</p>
          </div>
        )}

        {!loading && customer?.accessToken && library.length === 0 && !error && (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
            <BookOpen size={34} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-extrabold mb-2">No Digital Purchases Yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              When you buy, claim or start a trial for a digital product, it will appear here automatically.
            </p>
            <Link
              to="/digital-products"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#FDC700] text-black font-bold text-sm hover:bg-yellow-300"
            >
              Browse Digital Products
            </Link>
          </div>
        )}

        {!loading && library.length > 0 && (
          <div className="grid gap-5">
            {focusedProductId && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Focused Library Access</p>
                    <p className="text-sm font-bold text-emerald-900 mt-1">Your selected product is pinned to the top of the library list below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete('product');
                      setSearchParams(next, { replace: true });
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:border-emerald-400"
                  >
                    Clear Focus
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products, modules or lessons in your library..."
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] pl-10 pr-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {LIBRARY_FILTERS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLibraryFilter(option.key)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${
                        libraryFilter === option.key
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {filteredLibrary.length} of {library.length} product{library.length === 1 ? '' : 's'} shown. Open modules on-site, and only files marked downloadable by admin will show a download action.
              </p>
            </div>

            {filteredLibrary.length === 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
                <BookOpen size={34} className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-extrabold mb-2">No library items match this search</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Try a different keyword or switch the library filter to see more of your active digital access.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setLibraryFilter('all'); }}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-900"
                >
                  Clear Search
                </button>
              </div>
            )}

            {visibleLibrary.map((item) => {
              const certificateIssued = item.certificateStatus === 'generated' && (
                item.certificateIssued || item.certificate?.issued || item.certificate?.emailStatus === 'sent'
              );
              const isFocusedProduct = focusedProductId && String(item.productId) === focusedProductId;
              const supportEmailLink = buildSupportEmailLink(item.supportEmail || '', item.productName || '');
              const supportWhatsAppLink = buildSupportWhatsAppLink(item.supportWhatsApp || '', item.productName || '');

              return (
              <div key={item._id} className={`bg-white rounded-3xl border overflow-hidden ${
                isFocusedProduct ? 'border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]' : 'border-gray-100'
              }`}>
                <div className="grid md:grid-cols-[220px_1fr] gap-0">
                  <div className="bg-[#fcfbf7] min-h-[220px]">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        onError={(event) => { event.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <BookOpen size={42} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FDC700] mb-2">
                          {item.digitalType || 'Digital Product'}
                        </p>
                        <h2 className="text-xl font-extrabold">{item.productName}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 capitalize border border-gray-200">
                            {item.digitalAccessKind === 'free' ? 'Free access' : item.digitalAccessKind === 'trial' ? 'Free trial' : 'Paid access'}
                          </span>
                          <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 capitalize border border-gray-200">
                            {item.accessType === 'lifetime' ? 'Lifetime access' : `${item.accessMonths || 6} month access`}
                          </span>
                          {item.trialStatus === 'trialing' && item.trialEndsAt && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                              Trial ends {formatShortDate(item.trialEndsAt)}
                            </span>
                          )}
                          {item.trialStatus === 'trialing' && item.billingAmount > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                              Then GHS {Number(item.billingAmount).toLocaleString()}
                            </span>
                          )}
                          {item.isSeries && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-100">
                              Series
                            </span>
                          )}
                          {item.isCertified && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                              Certified
                            </span>
                          )}
                          {item.expiresAt && (
                            <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 border border-gray-200">
                              Expires {formatShortDate(item.expiresAt)}
                            </span>
                          )}
                        </div>
                        {item.isSeries && item.seriesTitle && (
                          <p className="text-xs font-bold text-gray-700 mt-2">{item.seriesTitle}</p>
                        )}
                        {item.isSeries && item.seriesDescription && (
                          <p className="text-xs text-gray-500 mt-1">{item.seriesDescription}</p>
                        )}
                        {item.productDesc && (
                          <p className="text-sm text-gray-500 leading-relaxed mt-2 max-w-2xl">{item.productDesc}</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p className="font-bold text-gray-700">{item.files.length} file{item.files.length !== 1 ? 's' : ''}</p>
                        <p>Order {item.orderId}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4 mb-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">Learning Progress</p>
                          <p className="text-sm font-extrabold text-gray-800">
                            {item.progress?.completedModules || 0} of {item.progress?.totalModules || item.files.length} module{(item.progress?.totalModules || item.files.length) === 1 ? '' : 's'} completed
                          </p>
                          <div className="mt-3 h-2 rounded-full bg-white border border-gray-200 overflow-hidden max-w-xl">
                            <div
                              className="h-full bg-black transition-all"
                              style={{ width: `${item.progress?.percent || 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Open each module first, then mark it complete here so your certificate progress can move forward correctly.
                          </p>
                        </div>

                        {item.isCertified && (
                          <div className="lg:text-right">
                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${
                              certificateIssued
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {certificateIssued ? <CheckCircle2 size={14} /> : <Award size={14} />}
                              {item.certificateStatus === 'generated'
                                ? (certificateIssued ? 'Certificate issued' : 'Certificate ready')
                                : item.certificateStatus === 'requested'
                                  ? 'Certificate requested'
                                  : item.certificateStatus === 'eligible'
                                    ? 'Certificate eligible'
                                    : 'Certificate in progress'}
                            </div>
                            {certificateIssued && (
                              <p className="text-xs text-gray-500 mt-2 max-w-sm">
                                Check your recipient email to download it, and save a copy to cloud storage for backup.
                              </p>
                            )}
                            {!certificateIssued && item.certificateDescription && (
                              <p className="text-xs text-gray-500 mt-2 max-w-sm">{item.certificateDescription}</p>
                            )}
                            {item.certificateStatus === 'eligible' && (
                              <button
                                onClick={() => openCertificateRequest(item)}
                                disabled={actioning === `${item._id}-certificate`}
                                className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-60"
                              >
                                {actioning === `${item._id}-certificate` ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                                Request Certificate
                              </button>
                            )}
                            {item.certificateStatus === 'requested' && (
                              <p className="text-xs font-bold text-amber-700 mt-3">
                                Your request has been sent for admin review. Once approved, your finished certificate will be sent to your email as a PDF.
                              </p>
                            )}
                            {item.certificateStatus === 'generated' && certificateIssued && (
                              <p className="text-xs font-bold text-emerald-700 mt-3">
                                Certificate issued successfully. Check your recipient email, then keep a cloud backup after downloading it.
                              </p>
                            )}
                            {item.certificateStatus === 'generated' && item.certificate && (
                              <button
                                onClick={() => generateCertificate(item.certificate)}
                                className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                              >
                                <Award size={15} />
                                View Certificate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {(supportEmailLink || supportWhatsAppLink) && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 mb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 mb-1">Learner Support</p>
                            <p className="text-sm font-extrabold text-blue-950">Need help with this product while learning on the web?</p>
                            <p className="text-xs text-blue-900/80 leading-relaxed mt-2">
                              Stay inside your digital library for the lessons, then reach out to the trainer or tutor if you need support with a module, task or question.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {supportEmailLink && (
                              <a
                                href={supportEmailLink}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-extrabold text-white hover:bg-gray-900"
                              >
                                <Mail size={15} />
                                Email Trainer
                              </a>
                            )}
                            {supportWhatsAppLink && (
                              <a
                                href={supportWhatsAppLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-900 hover:border-blue-400"
                              >
                                <Phone size={15} />
                                WhatsApp Trainer
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3">
                      {item.files.map((file) => {
                        const previewKey = `${item._id}-${file.assetId}-inline`;
                        const downloadKey = `${item._id}-${file.assetId}-download`;
                        const completeKey = `${item._id}-${file.assetId}-complete`;

                        return (
                          <div key={file.assetId} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                  <span className="text-[#FDC700]">{fileIcon(file.fileKind)}</span>
                                  {file.stepNumber && (
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-extrabold text-white">
                                      {file.stepNumber}
                                    </span>
                                  )}
                                  <span className="truncate">{file.label || file.originalFilename}</span>
                                </div>
                                {file.stepTitle && file.stepTitle !== file.label && (
                                  <p className="text-xs font-bold text-gray-700 mt-2">{file.stepTitle}</p>
                                )}
                                {file.stepSummary && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{file.stepSummary}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                  <span className="rounded-full bg-white px-2.5 py-1 border border-gray-200 capitalize">
                                    {file.fileKind}
                                  </span>
                                  {file.bytes > 0 && (
                                    <span className="rounded-full bg-white px-2.5 py-1 border border-gray-200">
                                      {formatBytes(file.bytes)}
                                    </span>
                                  )}
                                  <span className={`rounded-full px-2.5 py-1 border ${
                                    file.allowDownload
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                      : 'bg-amber-50 border-amber-100 text-amber-700'
                                  }`}>
                                    {file.allowDownload ? 'Download allowed' : 'View only'}
                                  </span>
                                  {file.openedAt && (
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 border border-blue-100 text-blue-700">
                                      Opened
                                    </span>
                                  )}
                                  {file.isCompleted && (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100 text-emerald-700">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {file.canPreview && (
                                  <button
                                    onClick={() => openAsset(item._id, file.assetId, 'inline')}
                                    disabled={opening === previewKey}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-60"
                                  >
                                    {opening === previewKey ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
                                    Open Securely
                                  </button>
                                )}
                                {file.allowDownload && (
                                  <button
                                    onClick={() => openAsset(item._id, file.assetId, 'download')}
                                    disabled={opening === downloadKey}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                                  >
                                    {opening === downloadKey ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    Download
                                  </button>
                                )}
                                <button
                                  onClick={() => markModuleComplete(item._id, file.assetId)}
                                  disabled={!file.openedAt || file.isCompleted || actioning === completeKey}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actioning === completeKey ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                  {file.isCompleted ? 'Completed' : 'Mark Complete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {viewer && (
        <div
          className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm p-3 sm:p-5"
          onClick={() => setViewer(null)}
        >
          {(() => {
            const viewerSupportEmailLink = buildSupportEmailLink(viewer.supportEmail || '', viewer.productName || '');
            const viewerSupportWhatsAppLink = buildSupportWhatsAppLink(viewer.supportWhatsApp || '', viewer.productName || '');
            return (
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDC700]">Secure Viewer</p>
                <h3 className="mt-1 text-lg font-extrabold">{viewer.productName}</h3>
                <p className="mt-1 text-xs text-gray-300">
                  {viewer.file.label || viewer.file.originalFilename} {viewer.file.allowDownload ? 'can be downloaded if needed.' : 'is view-only in this library.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-gray-300 hover:border-white hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden bg-black">
              <div className="pointer-events-none absolute inset-0 z-10 opacity-15">
                <div className="grid h-full grid-cols-2 gap-10 p-8 sm:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="rotate-[-24deg] text-[10px] font-bold uppercase tracking-[0.24em] text-white/80 sm:text-xs">
                      {viewer.customerName} {viewer.customerEmail ? `• ${viewer.customerEmail}` : ''} • Belle Kreyashon
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-[1] flex h-full items-center justify-center p-3 sm:p-6">
                {viewer.file.fileKind === 'image' ? (
                  <img
                    src={viewer.url}
                    alt={viewer.file.label || viewer.file.originalFilename}
                    className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                    draggable="false"
                  />
                ) : viewer.file.fileKind === 'video' ? (
                  <video
                    src={viewer.url}
                    className="max-h-full w-full rounded-2xl bg-black shadow-2xl"
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                  />
                ) : viewer.file.fileKind === 'audio' ? (
                  <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FDC700] text-black">
                      <PlayCircle size={26} />
                    </div>
                    <p className="text-lg font-extrabold">{viewer.file.label || viewer.file.originalFilename}</p>
                    <p className="mt-2 text-sm text-gray-300">Audio stays inside your secure library unless download has been enabled.</p>
                    <audio
                      src={viewer.url}
                      className="mt-6 w-full"
                      controls
                      controlsList="nodownload noremoteplayback"
                    />
                  </div>
                ) : (
                  <iframe
                    src={viewer.url}
                    title={viewer.file.label || viewer.file.originalFilename}
                    className="h-full w-full rounded-2xl bg-white"
                    sandbox="allow-same-origin allow-scripts"
                  />
                )}
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/70 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Keep learning right here in the web library, and if you need help with this lesson or module, contact your trainer or tutor for support.
                </p>
                {(viewerSupportEmailLink || viewerSupportWhatsAppLink) && (
                  <div className="flex flex-wrap gap-2">
                    {viewerSupportEmailLink && (
                      <a
                        href={viewerSupportEmailLink}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-extrabold text-black hover:bg-gray-100"
                      >
                        <Mail size={14} />
                        Email Trainer
                      </a>
                    )}
                    {viewerSupportWhatsAppLink && (
                      <a
                        href={viewerSupportWhatsAppLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent px-3 py-2 text-xs font-bold text-white hover:border-white"
                      >
                        <Phone size={14} />
                        WhatsApp Trainer
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {certificateTarget && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (actioning === `${certificateTarget._id}-certificate`) return;
            setCertificateTarget(null);
            setCertificateFormError('');
          }}
        >
          <div
            className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDC700]">Certificate Request</p>
                <h3 className="text-xl font-extrabold mt-1">{certificateTarget.productName}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Provide the exact learner details we should use on the certificate and for the final PDF email delivery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (actioning === `${certificateTarget._id}-certificate`) return;
                  setCertificateTarget(null);
                  setCertificateFormError('');
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-black hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                We will send the generated certificate to the email below after admin approval, so please check the spelling carefully.
              </div>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <User size={15} className="text-[#FDC700]" />
                  Full name for certificate
                </span>
                <input
                  value={certificateForm.learnerName}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerName: event.target.value }))}
                  placeholder="Enter the full name exactly as it should appear"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Mail size={15} className="text-[#FDC700]" />
                  Certificate email
                </span>
                <input
                  value={certificateForm.learnerEmail}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerEmail: event.target.value }))}
                  placeholder="name@example.com"
                  inputMode="email"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Phone size={15} className="text-[#FDC700]" />
                  Phone or WhatsApp
                </span>
                <input
                  value={certificateForm.learnerPhone}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerPhone: event.target.value }))}
                  placeholder="0241234567 or +233241234567"
                  inputMode="tel"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 text-sm font-bold text-gray-700">Note to admin</span>
                <textarea
                  value={certificateForm.notes}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional note about spelling, preferred learner name, or certificate details"
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black resize-none"
                />
              </label>

              {certificateFormError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {certificateFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (actioning === `${certificateTarget._id}-certificate`) return;
                    setCertificateTarget(null);
                    setCertificateFormError('');
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCertificateRequest}
                  disabled={actioning === `${certificateTarget._id}-certificate`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {actioning === `${certificateTarget._id}-certificate` ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                  Submit Certificate Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSuccess={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
