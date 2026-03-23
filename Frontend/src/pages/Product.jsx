import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, ChevronLeft } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import CustomerModal from '../components/CustomerModal';

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

            {product.wholesalePrice && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4 w-fit">
                {['retail', 'wholesale'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-black text-white' : 'text-gray-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-1">
              <p className="text-3xl font-extrabold">GHS {price?.toLocaleString()}</p>
              {discountActive && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400 line-through">GHS {retailPrice?.toLocaleString()}</span>
                  <span className="text-xs font-extrabold text-green-600">
                    -{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'} off
                  </span>
                </div>
              )}
            </div>
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

            {product.desc && <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.desc}</p>}

            {product.variants?.length > 0 && (
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

            <div className="flex items-center gap-4 mb-6">
              <p className="text-sm font-bold">Quantity:</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-black transition-all"><Minus size={14} /></button>
                <span className="font-extrabold text-lg w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => product.stock !== null ? Math.min(product.stock, q + 1) : q + 1)} className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-black transition-all"><Plus size={14} /></button>
              </div>
            </div>

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
                {added ? 'Added to Cart!' : isWholesale ? 'Add Wholesale Order' : product.isPreOrder ? 'Pre-Order Now' : 'Add to Cart'}
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