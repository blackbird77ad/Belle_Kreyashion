import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Star, Headphones, Flame } from 'lucide-react';
import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import { MessageCircle, X, AlertCircle, Loader2 } from 'lucide-react';
import { CATEGORIES } from '../data/categories';

const WHATSAPP_NUM = '233548894600';

const calcDiscountedPrice = (p) => {
  if (!p.discount?.active) return p.retailPrice;
  if (p.discount.type === 'percent') return Math.round(p.retailPrice * (1 - p.discount.value / 100));
  return Math.max(0, p.retailPrice - p.discount.value);
};

const ProductCard = ({ product }) => {
  const discounted = product.discount?.active;
  const finalPrice = calcDiscountedPrice(product);
  return (
    <Link to={`/shop/${product._id}`}
      className={`block bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 ${discounted ? 'border-[#FDC700]' : 'border-gray-100'}`}>
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
        {discounted && <span className="absolute top-2 left-2 bg-[#FDC700] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">-{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'}</span>}
        {product.stock !== null && product.stock <= 5 && product.stock > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">Only {product.stock} left</span>}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
        <h3 className="font-extrabold text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
        <div className="flex items-center gap-2">
          <p className="font-extrabold text-base">GHS {finalPrice?.toLocaleString()}</p>
          {discounted && <p className="text-xs text-gray-400 line-through">GHS {product.retailPrice?.toLocaleString()}</p>}
        </div>
      </div>
    </Link>
  );
};

function PartnerCard({ product: p, onAddToCart }) {
  const lastUpdated = p.updatedAt ? new Date(p.updatedAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : null;

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border-2 border-[#FDC700] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Info tooltip */}
      <div className="absolute top-2 right-2 z-30 group">
        <div className="w-5 h-5 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center cursor-pointer shadow-sm">
          <span className="text-gray-500 text-xs font-extrabold leading-none">i</span>
        </div>
        <div className="absolute right-0 top-6 w-60 bg-black text-white text-xs rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-40 leading-relaxed">
          <p className="font-bold text-[#FDC700] mb-1">Partner Product</p>
          Sold by a verified partner. Stock is updated daily by our team.
          {lastUpdated && <p className="mt-1 text-gray-400">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
        <span className="absolute top-2 left-2 bg-black text-[#FDC700] text-xs font-extrabold px-2 py-0.5 rounded-full">Partner</span>
        {p.stock !== null && p.stock <= 5 && p.stock > 0 && (
          <span className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Only {p.stock} left</span>
        )}
        {p.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{p.category || 'Partner'}</p>
        <h3 className="font-extrabold text-sm leading-tight line-clamp-2 mb-1">{p.name}</h3>
        {p.desc && <p className="text-xs text-gray-400 line-clamp-2 mb-1">{p.desc}</p>}
        {lastUpdated && <p className="text-xs text-gray-300 mb-1">Stock updated: {lastUpdated}</p>}
        {p.price ? (
          <p className="font-extrabold text-base mb-2">GHS {p.price?.toLocaleString()}</p>
        ) : (
          <p className="text-xs text-[#FDC700] font-bold mb-2">Contact us for price</p>
        )}

        {p.stock === 0 ? (
          <button disabled className="w-full py-2 bg-gray-100 text-gray-400 text-xs font-extrabold rounded-xl cursor-not-allowed">Out of Stock</button>
        ) : p.price ? (
          <button onClick={() => onAddToCart(p)}
            className="w-full py-2 bg-[#FDC700] text-black text-xs font-extrabold rounded-xl hover:bg-yellow-300 transition-all flex items-center justify-center gap-1">
            Add to Cart
          </button>
        ) : (
          <a href={`https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent('Hi! I am interested in: ' + p.name + '. Please share pricing and availability.')}`}
            target="_blank" rel="noopener noreferrer"
            className="block w-full py-2 bg-[#FDC700] text-black text-xs font-extrabold rounded-xl hover:bg-yellow-300 transition-all text-center">
            Enquire on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}


const SectionHeader = ({ label, title, cta, to }) => (
  <div className="flex justify-between items-end mb-6">
    <div>
      {label && <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">{label}</p>}
      <h2 className="text-2xl md:text-3xl font-extrabold">{title}</h2>
    </div>
    {cta && <Link to={to || '/shop'} className="text-sm font-bold flex items-center gap-1 hover:text-[#FDC700] transition-colors whitespace-nowrap">{cta} <ArrowRight size={14} /></Link>}
  </div>
);

export default function Home() {
  const [partnerNotice, setPartnerNotice] = useState(null); // holds partner product when notice modal is shown
  const { data: fastSelling }  = useFetch('/api/products/public?fastSelling=true&limit=8');
  const { data: featured }     = useFetch('/api/products/public?featured=true&limit=8');
  const { data: externalFeat } = useFetch('/api/featured/public');
  const { data: discounted }   = useFetch('/api/products/discounted');
  const { data: tools }        = useFetch('/api/products/public?category=Braiding%20%26%20Tools&limit=6');
  const { data: mannequins }   = useFetch('/api/products/public?category=Mannequins%20%26%20Stands&limit=6');

  // Merge Anna's featured products + active external featured brands for the featured section
  const allFeatured = [
    ...(featured || []),
    ...(externalFeat || []).filter(f => new Date(f.subscriptionEnd) > new Date() && f.active).map(f => ({
      _id: f._id,
      name: f.productName,
      category: f.brandName,
      images: [f.image],
      retailPrice: null,
      desc: f.desc,
      isExternal: true,
    }))
  ];

  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="relative h-[65vh] min-h-[420px] bg-black flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        <div className="absolute inset-0 opacity-30">
          <img src="/shop-category/hairextension.avif" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-20 max-w-7xl mx-auto px-4">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-[4px] mb-3">Premium Hair & Beauty</p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            Your Hair.<br /><span className="text-[#FDC700]">Your Crown.</span>
          </h1>
          <p className="text-gray-300 max-w-md mb-8 leading-relaxed text-sm md:text-base">
            Premium hair extensions, braiding tools, beauty supplies and more. Nationwide and international delivery.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/shop" className="flex items-center gap-2 px-6 py-3 bg-[#FDC700] text-black font-extrabold rounded-full hover:bg-yellow-300 transition-all text-sm">
              Shop Now <ArrowRight size={16} />
            </Link>
            <Link to="/services" className="flex items-center gap-2 px-6 py-3 border-2 border-white text-white font-extrabold rounded-full hover:border-[#FDC700] hover:text-[#FDC700] transition-all text-sm">
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-[#FDC700] py-3">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Truck size={16} />, text: 'Nationwide Delivery' },
            { icon: <ShieldCheck size={16} />, text: 'Authentic Products' },
            { icon: <Star size={16} />, text: 'Premium Quality' },
            { icon: <Headphones size={16} />, text: '24/7 Support' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 justify-center text-black font-bold text-xs md:text-sm">{b.icon} {b.text}</div>
          ))}
        </div>
      </section>

      {/* Fast Selling */}
      {fastSelling?.length > 0 && (
        <section className="py-14 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <SectionHeader label="Moving Fast" title={<span className="flex items-center gap-2"><Flame size={26} className="text-red-500" /> Fast Selling</span>} cta="Shop All" to="/shop" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {fastSelling.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Featured — Anna's + external brands */}
      {allFeatured.length > 0 && (
        <section className="py-14 px-4 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">Handpicked & Trusted</p>
              <h2 className="text-2xl md:text-3xl font-extrabold">Featured Products</h2>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/services#feature" className="text-xs text-gray-400 hover:text-black underline">Get Featured</Link>
              <Link to="/shop" className="text-sm font-bold flex items-center gap-1 hover:text-[#FDC700]">View All <ArrowRight size={14} /></Link>
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-6">Products from Belle Kreyashon and trusted partner brands</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allFeatured.map(p => (
              p.isExternal ? (
                <PartnerCard key={p._id} product={p} onAddToCart={(prod) => setPartnerNotice(prod)} />
              ) : (
                <ProductCard key={p._id} product={p} />
              )
            ))}
          </div>
        </section>
      )}

      {/* Discounts */}
      {discounted?.length > 0 && (
        <section className="py-14 px-4 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">Limited Time</p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">Special Offers</h2>
              </div>
              <Link to="/shop" className="text-sm font-bold text-[#FDC700] flex items-center gap-1">View All <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {discounted.map(product => {
                const finalPrice = calcDiscountedPrice(product);
                return (
                  <Link key={product._id} to={`/shop/${product._id}`}
                    className="block bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-[#FDC700]">
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
                      <span className="absolute top-2 left-2 bg-[#FDC700] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">
                        -{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'}
                      </span>
                    </div>
                    <div className="p-3">
                      <h3 className="font-extrabold text-sm line-clamp-2 mb-1">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">GHS {finalPrice?.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 line-through">GHS {product.retailPrice?.toLocaleString()}</span>
                      </div>
                      {product.discount.label && <p className="text-xs text-[#FDC700] font-bold mt-0.5">{product.discount.label}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Shop by Category — bigger cards, bigger text */}
      <section className="py-14 px-4 max-w-7xl mx-auto">
        <SectionHeader label="Browse" title="Shop by Category" cta="All Products" to="/shop" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {CATEGORIES.filter(c => c.value !== 'All').map(cat => (
            <Link key={cat.value} to={`/shop?category=${encodeURIComponent(cat.value)}`}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[3/4]">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-all z-10" />
              {cat.image && <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { e.target.parentElement.style.background = '#111'; }} />}
              <div className="absolute inset-0 z-20 flex items-end p-4">
                <span className="text-white font-extrabold text-base leading-tight drop-shadow-lg">{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hair Tools */}
      {tools?.length > 0 && (
        <section className="py-14 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <SectionHeader label="Professional Grade" title="Braiding & Hair Tools" cta="Shop Tools" to="/shop?category=Braiding+%26+Tools" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tools.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Mannequins */}
      {mannequins?.length > 0 && (
        <section className="py-14 px-4 max-w-7xl mx-auto">
          <SectionHeader label="For Professionals & Students" title="Mannequins & Stands" cta="Shop All" to="/shop?category=Mannequins+%26+Stands" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mannequins.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* Learn & Grow CTA */}
      <section className="py-16 px-4 bg-black text-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Learn & Grow</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Hair Training & Consultation</h2>
            <p className="text-gray-400 mb-3 leading-relaxed">Whether you want to start your own hair business, improve your styling skills, or simply get expert advice — we have a session for you.</p>
            <ul className="text-gray-400 text-sm space-y-2 mb-6">
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Professional hands-on training for beginners and advanced stylists</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> One-on-one paid consultations for business and personal hair goals</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Free consultation available — just reach out and ask</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Importation assistance for bulk orders from abroad</li>
            </ul>
            <Link to="/services" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#FDC700] text-black font-extrabold rounded-full hover:bg-yellow-300 transition-all text-sm">
              Explore Services <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-800">
              <img src="/shop-category/hairextension.avif" alt="" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-800 mt-6">
              <img src="/shop-category/mannequin.avif" alt="" className="w-full h-full object-cover opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* Get Featured CTA */}
      <section className="py-14 px-4 bg-[#FDC700]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-black/60 text-xs font-bold uppercase tracking-widest mb-2">For Brands & Sellers</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-black mb-3">Want Your Product Featured Here?</h2>
          <p className="text-black/70 text-sm mb-6 leading-relaxed">Get your product in front of thousands of hair and beauty customers across Ghana. Affordable subscription plans from 1 month. Your brand identity stays private — we handle visibility, you handle orders.</p>
          <Link to="/services" className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white font-extrabold rounded-full hover:bg-gray-900 transition-all text-sm">
            Apply to Get Featured <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Partner stock notice modal */}
      {partnerNotice && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPartnerNotice(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-yellow-600" />
            </div>
            <h3 className="font-extrabold text-base text-center mb-2">Partner Product Notice</h3>
            <p className="text-sm text-gray-600 text-center mb-1"><span className="font-bold">{partnerNotice.name}</span></p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-800 leading-relaxed">
              <p>This is a partner product. Stock is updated daily by our team.</p>
              {partnerNotice.updatedAt && (
                <p className="font-bold mt-1">Last stock update: {new Date(partnerNotice.updatedAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
              )}
              <p className="mt-1">If unsure, WhatsApp or call Anna to confirm before paying.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => {
                const cartProduct = { _id: partnerNotice._id, name: partnerNotice.name, images: partnerNotice.images || [], retailPrice: partnerNotice.price, discount: null, stock: partnerNotice.stock, category: 'Partner' };
                sessionStorage.setItem('bk_partner_order', JSON.stringify({ product: cartProduct, qty: 1 }));
                setPartnerNotice(null);
                window.location.href = '/shop';
              }} className="w-full py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl hover:bg-yellow-300">
                I Understand — Add to Cart
              </button>
              <a href={`https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent('Hi! I want to confirm stock for: ' + partnerNotice.name + ' before ordering.')}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full py-3 bg-green-500 text-white font-extrabold text-sm rounded-xl hover:bg-green-600 text-center flex items-center justify-center gap-2">
                <MessageCircle size={16} /> Confirm with Anna First
              </a>
              <button onClick={() => setPartnerNotice(null)} className="text-sm text-gray-400 hover:text-black text-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}