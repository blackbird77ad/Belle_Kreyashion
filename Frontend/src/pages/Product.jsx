import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, ChevronLeft, ChevronDown, ChevronUp, ShieldCheck, Mail, Phone } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useIntlPreferences } from '../context/IntlContext';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';
import { buildBreadcrumbSchema, getDigitalCheckoutPath, getProductPath, toAbsoluteUrl } from '../utils/seoPaths';
import { buildDiscountPresentation } from '../utils/discounts';
import { trackProductView } from '../utils/marketing';

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

export default function Product() {
  const { slugOrId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { cart, addToCart, removeOwnedDigitalItems } = useCart();
  const { customer } = useCustomer();
  const { formatMoney, ghanaCheckoutNote, isConvertedDisplay } = useIntlPreferences();
  const [product,   setProduct]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('retail');
  const [qty,       setQty]       = useState(1);
  const [variant,   setVariant]   = useState(null);
  const [imgIdx,    setImgIdx]    = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [added,     setAdded]     = useState(false);
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [showModulePreview, setShowModulePreview] = useState(false);
  const autoCheckoutHandledRef = useRef('');
  const checkoutIntent = searchParams.get('checkout') === '1';

  useEffect(() => {
    api.get(`/api/products/public/${slugOrId}`, customer?.accessToken
      ? { headers: { 'x-customer-token': customer.accessToken } }
      : undefined)
      .then((r) => {
        setProduct(r.data);
        setLoading(false);

        const canonicalPath = getProductPath(r.data);
        if (r.data?.slug && canonicalPath !== pathname) {
          navigate(checkoutIntent ? `${canonicalPath}?checkout=1` : canonicalPath, { replace: true });
        }
      })
      .catch(() => {
        setLoading(false);
        navigate(pathname.startsWith('/digital-products/') ? '/digital-products' : '/shop');
      });
  }, [slugOrId, navigate, customer?.accessToken, checkoutIntent, pathname]);

  useEffect(() => {
    setAdded(false);
    setShowCheckoutPrompt(false);
    setShowModulePreview(false);
    autoCheckoutHandledRef.current = '';
  }, [slugOrId]);

  useEffect(() => {
    if (!product?._id || !product?.isDigital || !product?.customerHasAccess) return;
    removeOwnedDigitalItems([product._id]);
  }, [product?._id, product?.isDigital, product?.customerHasAccess]);

  const isDigital = !!product?.isDigital;
  const digitalAccessKind = product?.digitalAccessKind || 'paid';
  const isFreeDigital = isDigital && digitalAccessKind === 'free';
  const isTrialDigital = isDigital && digitalAccessKind === 'trial';
  const isCertifiedDigital = isDigital && !!product?.isCertified;
  const freeTrialDays = product?.freeTrialDays || 7;
  const digitalModulesOutline = product?.digitalModulesOutline || [];
  const customerHasAccess = !!product?.customerHasAccess;
  const supportEmail = product?.supportEmail || '';
  const supportWhatsApp = product?.supportWhatsApp || '';
  const supportEmailLink = buildSupportEmailLink(supportEmail, product?.name || '');
  const supportWhatsAppLink = buildSupportWhatsAppLink(supportWhatsApp, product?.name || '');
  const isWholesale = tab === 'wholesale';
  const retailPrice  = product?.retailPrice;
  const discountPreview = buildDiscountPresentation(retailPrice, product?.discount || {}, { respectLiveState: true });
  const discountActive = !isWholesale && discountPreview.discounted;
  const finalPrice   = discountActive ? discountPreview.finalPrice : retailPrice;
  const price        = isWholesale ? product?.wholesalePrice : finalPrice;
  const digitalCartKey = product?._id ? `digital-${product._id}` : '';
  const isDigitalAlreadyInCart = !!(isDigital && digitalCartKey && cart.some((item) => item.key === digitalCartKey));
  const directCheckoutPath = isDigital ? getDigitalCheckoutPath(product || { _id: slugOrId }) : '';

  useEffect(() => {
    if (!checkoutIntent || !product?._id || !isDigital) return;
    const handledKey = `${product._id}:${checkoutIntent}`;
    if (autoCheckoutHandledRef.current === handledKey) return;
    autoCheckoutHandledRef.current = handledKey;

    if (customerHasAccess) {
      navigate(`/digital-library?product=${product._id}`, { replace: true });
      return;
    }

    if (!isDigitalAlreadyInCart) {
      addToCart(product, 1, false, null);
    }
    navigate('/shop/checkout', { replace: true });
  }, [checkoutIntent, product, isDigital, customerHasAccess, isDigitalAlreadyInCart, addToCart, navigate]);

  useEffect(() => {
    if (!product?._id) return;
    trackProductView({
      product: {
        _id: product._id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        brand: 'Belle Kreyashon',
        isDigital,
      },
      price: isDigital && digitalAccessKind !== 'paid' ? 0 : Number(finalPrice || 0),
    });
  }, [product?._id, product?.slug, product?.name, product?.category, isDigital, digitalAccessKind, finalPrice]);

  const doAddToCart = () => {
    addToCart(product, qty, isWholesale, variant);
    if (isDigital) {
      setShowCheckoutPrompt(true);
      return;
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleAddToCart = () => {
    if (isDigital && customerHasAccess) {
      navigate(`/digital-library?product=${product._id}`);
      return;
    }

    if (isDigitalAlreadyInCart) {
      navigate('/shop/checkout');
      return;
    }

    if (!customer) {
      setShowModal(true); // modal will call doAddToCart on success
      return;
    }
    doAddToCart();
  };

  if (loading) return (
    <div className="pt-16 min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!product) return null;

  const canonicalPath = getProductPath(product);
  const seoDescription = product.desc || (
    isDigital
      ? `Buy secure access to ${product.name} from Belle Kreyashon and open it inside your protected digital library in Ghana.`
      : `Buy ${product.name} from Belle Kreyashon in Ghana with delivery across Accra and nationwide.`
  );
  const productImages = Array.isArray(product.images)
    ? product.images.filter(Boolean).map((image) => toAbsoluteUrl(image))
    : [];
  const seoSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: seoDescription,
      image: productImages,
      category: product.category || '',
      sku: product.slug || product._id,
      brand: {
        '@type': 'Brand',
        name: 'Belle Kreyashon',
      },
      seller: {
        '@type': 'Organization',
        name: 'Belle Kreyashon',
        url: 'https://bellekreyashon.com',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'GHS',
        price: Number(price || 0),
        availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        url: toAbsoluteUrl(canonicalPath),
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: product.name, path: canonicalPath },
    ]),
  ];

  return (
    <div className="pt-16 min-h-screen">
      <SEO
        title={product.name}
        description={seoDescription}
        image={product.images?.[0]}
        url={canonicalPath}
        type="product"
        keywords={[
          product.name,
          product.category,
          'Belle Kreyashon',
          'buy online Ghana',
          'hair and beauty Ghana',
          isDigital ? 'digital course Ghana' : 'beauty store Ghana',
        ].filter(Boolean).join(', ')}
        schema={seoSchema}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-black mb-6 transition-colors">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
              <img src={product.images?.[imgIdx]} alt={product.name} className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${imgIdx === i ? 'border-black' : 'border-gray-200'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{product.category}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-3">{product.name}</h1>

            {product.wholesalePrice && !isDigital && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4 w-fit">
                {['retail', 'wholesale'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-black text-white' : 'text-gray-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <p className="text-3xl font-extrabold">
                {isFreeDigital ? 'Free' : isTrialDigital ? 'Free Trial' : formatMoney(price)}
              </p>
              {discountActive && !isFreeDigital && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400 line-through">Was {formatMoney(discountPreview.basePrice)}</span>
                  <span className="text-xs font-extrabold text-green-600">Now {formatMoney(discountPreview.finalPrice)}</span>
                </div>
              )}
            </div>
            {discountActive && !isFreeDigital && (
              <div className="mb-3 max-w-md rounded-2xl border border-[#FDC700]/30 bg-[#fcfbf7] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {!!discountPreview.label && (
                    <span className="rounded-full border border-[#FDC700]/25 bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#9a7a00]">
                      {discountPreview.label}
                    </span>
                  )}
                  {!!discountPreview.limitText && (
                    <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                      {discountPreview.limitText}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-extrabold text-green-700">
                  {discountPreview.offerText}{discountPreview.limitText ? ` ${discountPreview.limitText}` : ''}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Was {formatMoney(discountPreview.basePrice)}. Now {formatMoney(discountPreview.finalPrice)}.
                </p>
              </div>
            )}
            {isTrialDigital && (
              <p className="text-sm text-gray-600 mb-3">
                Start with {freeTrialDays} free day{freeTrialDays === 1 ? '' : 's'}, then we bill <span className="font-extrabold">{formatMoney(price)}</span> if the trial continues.
              </p>
            )}
            {isConvertedDisplay && !isFreeDigital && (
              <p className="text-xs text-gray-500 mb-3">{ghanaCheckoutNote}</p>
            )}
            {isWholesale && product.wholesaleMinQty && (
              <p className="text-xs text-[#FDC700] font-bold mb-3">Minimum order: {product.wholesaleMinQty} units</p>
            )}

            {product.isPreOrder && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-bold text-yellow-800">Pre-Order Item</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  {product.preOrderType === 'deposit' ? `Pay ${product.depositPercent}% deposit to reserve` : 'Full payment required to reserve'}
                </p>
              </div>
            )}

            {isDigital && (
              <div className="bg-[#fcfbf7] border border-[#FDC700]/40 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FDC700] text-black flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">Secure Digital Product</p>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1">
                      {isFreeDigital
                        ? 'This digital product can be claimed for free and delivered through your protected digital library.'
                        : isTrialDigital
                          ? `This digital product starts with ${freeTrialDays} free day${freeTrialDays === 1 ? '' : 's'}. We save a reusable card authorization now so billing can happen when the trial ends.`
                          : 'Access is unlocked only after payment and delivered through your protected digital library.'}
                    </p>
                    {product.digitalFileCount > 0 && (
                      <p className="text-xs font-bold text-[#9a7a00] mt-2">
                        Includes {product.digitalFileCount} secure file{product.digitalFileCount !== 1 ? 's' : ''}
                      </p>
                    )}
                    {product.digitalManualPageCount > 0 && (
                      <p className="text-xs font-bold text-[#9a7a00] mt-2">
                        Includes {product.digitalManualPageCount} written lesson page{product.digitalManualPageCount === 1 ? '' : 's'}
                      </p>
                    )}
                    {product.digitalModuleCount > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Arranged into {product.digitalModuleCount} module{product.digitalModuleCount === 1 ? '' : 's'} so learners can move through the lessons in sequence.
                      </p>
                    )}
                    {product.digitalFileCount > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {product.downloadableDigitalFileCount > 0
                          ? `${product.downloadableDigitalFileCount} file${product.downloadableDigitalFileCount === 1 ? '' : 's'} can be downloaded if allowed. The rest stay view-only inside your library.`
                          : 'Files stay view-only inside your digital library unless download is explicitly allowed.'}
                      </p>
                    )}
                    {isCertifiedDigital && (
                      <p className="text-xs font-bold text-amber-700 mt-2">
                        Certificate available after all modules are completed and the learner requests it.
                      </p>
                    )}
                    {isTrialDigital && (
                      <p className="text-xs text-gray-500 mt-2">
                        Card authorization is required to start the trial. Your access stays customer-only inside the digital library.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/digital-products')}
                      className="mt-3 inline-flex items-center text-xs font-bold text-black underline underline-offset-4 hover:text-[#9a7a00]"
                    >
                      Browse more digital products
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isDigital && customerHasAccess && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-extrabold text-emerald-800">You already have access to this digital product.</p>
                <p className="text-xs text-emerald-900/80 leading-relaxed mt-1">
                  Open your digital library to continue learning on-site, revisit your modules, and track certificate progress.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/digital-library?product=${product._id}`)}
                  className="mt-3 inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-sm font-extrabold text-white hover:bg-gray-900"
                >
                  Open In My Library
                </button>
              </div>
            )}

            {isDigital && customerHasAccess && (supportEmail || supportWhatsApp) && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                <p className="text-sm font-extrabold text-blue-900">Need help while learning?</p>
                <p className="text-xs text-blue-900/80 leading-relaxed mt-1">
                  Stay inside the web library for your lessons, and contact your trainer or tutor directly if you need support with any module.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
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
            )}

            {product.desc && <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.desc}</p>}

            {isDigital && digitalModulesOutline.length > 0 && (
              <div className="mb-6 max-w-xl rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-[#fcfbf7] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Program Snapshot:</p>
                      <p className="mt-1 text-sm font-extrabold text-black">{`Module (${digitalModulesOutline.length})`}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
                        {customerHasAccess
                          ? 'Keep this page simple here and open your library for the full lesson experience.'
                          : 'Click to view module names only.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModulePreview((current) => !current)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                    >
                      {showModulePreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showModulePreview ? 'Hide List' : 'View List'}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#FDC700]/25 bg-white px-2.5 py-1 text-[11px] font-bold text-[#9a7a00]">
                      {product.digitalModuleCount} module{product.digitalModuleCount === 1 ? '' : 's'}
                    </span>
                    {isCertifiedDigital && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        Certificate included
                      </span>
                    )}
                  </div>
                </div>

                {showModulePreview && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <div className="space-y-2.5">
                      {digitalModulesOutline.map((module, moduleIndex) => (
                        <div
                          key={module.moduleId || `${module.title}-${moduleIndex}`}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#fcfbf7] px-3 py-2.5"
                        >
                          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black px-2 text-[11px] font-extrabold text-white">
                            {module.moduleNumber || moduleIndex + 1}
                          </div>
                          <p className="min-w-0 text-sm font-bold text-black">
                            {module.title || `Module ${module.moduleNumber || moduleIndex + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isCertifiedDigital && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-extrabold text-amber-800">
                  {product.certificateTitle || 'Certificate included'}
                </p>
                <p className="text-xs text-amber-900/80 leading-relaxed mt-1">
                  {product.certificateDescription || 'Finish the full learning path, mark every module complete in your digital library, then request your certificate for admin approval.'}
                </p>
              </div>
            )}

            {product.variants?.length > 0 && !isDigital && (
              <div className="mb-6">
                <p className="text-sm font-bold mb-2">Select Option:</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => (
                    <button key={i} onClick={() => setVariant(v.name)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${variant === v.name ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black'}`}>
                      {v.name} {v.price ? `- ${formatMoney(v.price)}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isDigital && (
              <div className="flex items-center gap-4 mb-6">
                <p className="text-sm font-bold">Quantity:</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-black transition-all"><Minus size={14} /></button>
                  <span className="font-extrabold text-lg w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(q => product.stock !== null ? Math.min(product.stock, q + 1) : q + 1)} className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-black transition-all"><Plus size={14} /></button>
                </div>
              </div>
            )}

            {isDigital && (
              <div className="flex items-center justify-between gap-4 mb-6 rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-sm font-bold text-gray-600">Access Quantity</p>
                <span className="font-extrabold text-lg">1</span>
              </div>
            )}

            {product.stock === 0 ? (
              product.isPreOrder ? (
                <button onClick={handleAddToCart}
                  className="w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 bg-black text-[#FDC700] hover:bg-gray-900 transition-all">
                  <ShoppingBag size={18} /> Pre-Order Now
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 bg-gray-100 text-gray-400 cursor-not-allowed">
                  Out of Stock
                </div>
              )
            ) : (
              <button onClick={handleAddToCart} disabled={product.stock !== null && product.stock < qty}
                className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${added ? 'bg-green-500 text-white' : 'bg-[#FDC700] text-black hover:bg-yellow-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                <ShoppingBag size={18} />
                {added
                  ? 'Added to Cart!'
                  : customerHasAccess
                    ? 'Open In My Library'
                  : isDigitalAlreadyInCart
                    ? 'Go Straight To Checkout'
                    : isFreeDigital
                      ? 'Get Free Access'
                      : isTrialDigital
                        ? 'Start Free Trial'
                        : isDigital
                          ? 'Buy Secure Access'
                          : isWholesale
                            ? 'Add Wholesale Order'
                            : product.isPreOrder
                              ? 'Pre-Order Now'
                              : 'Add to Cart'}
              </button>
            )}
            {isDigital && (showCheckoutPrompt || isDigitalAlreadyInCart) && (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-extrabold text-emerald-800">
                  Secure access is ready in your cart
                </p>
                <p className="text-xs text-emerald-900/80 leading-relaxed mt-1">
                  The learner can stay on this page, then move straight into secure Paystack checkout whenever ready.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/shop/checkout')}
                    className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white hover:bg-gray-900 transition-all"
                  >
                    Continue To Checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/digital-products')}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:border-emerald-400 transition-all"
                  >
                    Keep Browsing Digital Products
                  </button>
                </div>
              </div>
            )}
            {isDigital && !customerHasAccess && directCheckoutPath && (
              <a
                href={directCheckoutPath}
                className="mt-3 inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
              >
                Direct Checkout Link
              </a>
            )}
            {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
              <p className="text-center text-xs text-red-500 font-bold mt-2">Only {product.stock} left in stock!</p>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <CustomerModal
          onClose={() => setShowModal(false)}
          onSuccess={doAddToCart}
        />
      )}
    </div>
  );
}
