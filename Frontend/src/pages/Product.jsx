import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, ChevronLeft, ShieldCheck } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { customer } = useCustomer();
  const [product,   setProduct]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('retail');
  const [qty,       setQty]       = useState(1);
  const [variant,   setVariant]   = useState(null);
  const [imgIdx,    setImgIdx]    = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [added,     setAdded]     = useState(false);

  useEffect(() => {
    api.get(`/api/products/public/${id}`)
      .then(r => { setProduct(r.data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/shop'); });
  }, [id]);

  const isDigital = !!product?.isDigital;
  const digitalAccessKind = product?.digitalAccessKind || 'paid';
  const isFreeDigital = isDigital && digitalAccessKind === 'free';
  const isTrialDigital = isDigital && digitalAccessKind === 'trial';
  const isCertifiedDigital = isDigital && !!product?.isCertified;
  const freeTrialDays = product?.freeTrialDays || 7;
  const digitalOutline = product?.digitalOutline || [];
  const isWholesale = tab === 'wholesale';
  const retailPrice  = product?.retailPrice;
  const discountActive = !isWholesale && product?.discount?.active;
  const finalPrice   = discountActive
    ? product.discount.type === 'percent'
      ? Math.round(retailPrice * (1 - product.discount.value / 100))
      : Math.max(0, retailPrice - product.discount.value)
    : retailPrice;
  const price        = isWholesale ? product?.wholesalePrice : finalPrice;

  const doAddToCart = () => {
    addToCart(product, qty, isWholesale, variant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleAddToCart = () => {
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

  return (
    <div className="pt-16 min-h-screen">
      <SEO
      title={product.name}
      description={product.desc || `Buy ${product.name} at Belle Kreyashon Ghana. GHS ${product.retailPrice}. Fast delivery nationwide.`}
      image={product.images?.[0]}
      url={`/shop/${product._id}`}
      type="product"
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
                {isFreeDigital ? 'Free' : isTrialDigital ? 'Free Trial' : `GHS ${price?.toLocaleString()}`}
              </p>
              {discountActive && !isFreeDigital && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400 line-through">GHS {retailPrice?.toLocaleString()}</span>
                  <span className="text-xs font-extrabold text-green-600">
                    -{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'} off
                  </span>
                </div>
              )}
            </div>
            {isTrialDigital && (
              <p className="text-sm text-gray-600 mb-3">
                Start with {freeTrialDays} free day{freeTrialDays === 1 ? '' : 's'}, then we bill <span className="font-extrabold">GHS {price?.toLocaleString()}</span> if the trial continues.
              </p>
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

            {product.desc && <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.desc}</p>}

            {isDigital && product.isSeries && digitalOutline.length > 0 && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">Series Outline</p>
                  <p className="font-extrabold text-sm">{product.seriesTitle || 'Step-by-step content'}</p>
                  {product.seriesDescription && <p className="text-xs text-gray-500 mt-1">{product.seriesDescription}</p>}
                </div>
                <div className="p-4 space-y-3">
                  {digitalOutline.map((step, index) => (
                    <div key={`${step.assetId || step.label}-${index}`} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                        {step.stepNumber || index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{step.stepTitle || step.label}</p>
                        {step.stepSummary && <p className="text-xs text-gray-500 mt-0.5">{step.stepSummary}</p>}
                      </div>
                    </div>
                  ))}
                </div>
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
                      {v.name} {v.price ? `— GHS ${v.price}` : ''}
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
                {added ? 'Added to Cart!' : isFreeDigital ? 'Get Free Access' : isTrialDigital ? 'Start Free Trial' : isDigital ? 'Buy Secure Access' : isWholesale ? 'Add Wholesale Order' : product.isPreOrder ? 'Pre-Order Now' : 'Add to Cart'}
              </button>
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
