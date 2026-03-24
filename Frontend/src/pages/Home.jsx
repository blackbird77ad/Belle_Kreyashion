import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Star, Headphones, Flame, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import { CATEGORIES } from '../data/categories';
import { useCart } from '../context/CartContext';

const calcDiscountedPrice = (p) => {
  if (!p.discount?.active) return p.retailPrice;
  if (p.discount.type === 'percent') return Math.round(p.retailPrice * (1 - p.discount.value / 100));
  return Math.max(0, p.retailPrice - p.discount.value);
};

const ProductCard = ({ product, onPartnerClick }) => {
  const discounted = product.discount?.active;
  const finalPrice = calcDiscountedPrice(product);
  const isPartner  = product.isPartner;

  const lastUpdated = isPartner && product.updatedAt
    ? new Date(product.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const card = (
    <div className={`block bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 ${discounted ? 'border-[#FDC700]' : isPartner ? 'border-[#FDC700]' : 'border-gray-100'}`}>
      {/* Partner info tooltip */}
      {isPartner && (
        <div className="absolute top-2 right-2 z-30 group">
          <div className="w-6 h-6 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center cursor-pointer shadow-sm">
            <span className="text-gray-500 text-xs font-extrabold leading-none">i</span>
          </div>
          <div className="absolute right-0 top-7 w-64 bg-black text-white text-xs rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-40 leading-relaxed">
            <p className="font-bold text-[#FDC700] mb-1">Partner Product</p>
            <p>Fulfilled by a verified partner. Stock is confirmed daily. Full refund if unavailable after payment.</p>
            {lastUpdated && <p className="mt-2 text-gray-400">Stock last updated: <span className="text-white font-bold">{lastUpdated}</span></p>}
          </div>
        </div>
      )}

      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
        {isPartner && <span className="absolute top-2 left-2 bg-black text-[#FDC700] text-xs font-extrabold px-2 py-0.5 rounded-full">Partner</span>}
        {!isPartner && discounted && <span className="absolute top-2 left-2 bg-[#FDC700] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">-{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'}</span>}
        {product.stock !== null && product.stock <= 5 && product.stock > 0 && <span className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">Only {product.stock} left</span>}
        {product.stock === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white font-extrabold text-sm">Out of Stock</span></div>}
      </div>

      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
        <h3 className="font-extrabold text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
        <div className="flex items-center gap-2">
          <p className="font-extrabold text-base">GHS {finalPrice?.toLocaleString()}</p>
          {discounted && <p className="text-xs text-gray-400 line-through">GHS {product.retailPrice?.toLocaleString()}</p>}
        </div>
      </div>
    </div>
  );

  if (isPartner) {
    return (
      <div className="relative cursor-pointer" onClick={() => product.stock !== 0 && onPartnerClick(product)}>
        {card}
      </div>
    );
  }

  return <Link to={`/shop/${product._id}`} className="relative block">{card}</Link>;
};

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
  const [partnerNotice, setPartnerNotice] = useState(null);
  const [toast, setToast] = useState('');
  const { addToCart } = useCart();

  const { data: fastSelling } = useFetch('/api/products/public?fastSelling=true&limit=8');
  const { data: featured }    = useFetch('/api/products/public?featured=true&limit=12');
  const { data: discounted }  = useFetch('/api/products/discounted');
  const { data: tools }       = useFetch('/api/products/public?category=Braiding%20%26%20Tools&limit=6');
  const { data: mannequins }  = useFetch('/api/products/public?category=Mannequins%20%26%20Stands&limit=6');

  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="relative h-[65vh] min-h-[420px] bg-black flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        <div className="absolute inset-0 opacity-30">
          <img src="/shop-category/hairextension.avif" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-20 max-w-7xl mx-auto px-4">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-[4px] mb-3">Hair · Beauty · Fashion · Lifestyle</p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            Everything You<br /><span className="text-[#FDC700]">Need. All In One.</span>
          </h1>
          <p className="text-gray-300 max-w-md mb-8 leading-relaxed text-sm md:text-base">
            Hair extensions, wigs, beauty, skincare, fashion, health, gadgets and more. One store for everything — nationwide and international delivery.
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
            { icon: <Star size={16} />, text: 'All Categories' },
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
            <SectionHeader label="Moving Fast" title={<span className="flex items-center gap-2"><Flame size={26} className="text-red-500" /> Fast Selling</span>} cta="Shop All" to="/shop?filter=fastSelling" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {fastSelling.map(p => <ProductCard key={p._id} product={p} onPartnerClick={setPartnerNotice} />)}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      {featured?.length > 0 && (
        <section className="py-14 px-4 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">Handpicked & Trusted</p>
              <h2 className="text-2xl md:text-3xl font-extrabold">Featured Products</h2>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/services#feature" className="text-xs text-gray-400 hover:text-black underline hidden sm:block">Get Featured</Link>
              <Link to="/shop?filter=featured" className="text-sm font-bold flex items-center gap-1 hover:text-[#FDC700]">View All <ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map(p => <ProductCard key={p._id} product={p} onPartnerClick={setPartnerNotice} />)}
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
              {discounted.map(p => {
                const finalPrice = calcDiscountedPrice(p);
                return (
                  <Link key={p._id} to={`/shop/${p._id}`}
                    className="block bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-[#FDC700]">
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
                      <span className="absolute top-2 left-2 bg-[#FDC700] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">
                        -{p.discount.value}{p.discount.type === 'percent' ? '%' : ' GHS'}
                      </span>
                    </div>
                    <div className="p-3">
                      <h3 className="font-extrabold text-sm line-clamp-2 mb-1">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">GHS {finalPrice?.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 line-through">GHS {p.retailPrice?.toLocaleString()}</span>
                      </div>
                      {p.discount.label && <p className="text-xs text-[#FDC700] font-bold mt-0.5">{p.discount.label}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Shop by Category */}
      <section className="py-14 px-4 max-w-7xl mx-auto">
        <SectionHeader label="Browse" title="Shop by Category" cta="All Products" to="/shop" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {CATEGORIES.filter(c => c.value !== 'All').map(cat => (
            <Link key={cat.value} to={`/shop?category=${encodeURIComponent(cat.value)}`}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[3/4]">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-all z-10" />
              {cat.image && <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
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
              {tools.map(p => <ProductCard key={p._id} product={p} onPartnerClick={setPartnerNotice} />)}
            </div>
          </div>
        </section>
      )}

      {/* Mannequins */}
      {mannequins?.length > 0 && (
        <section className="py-14 px-4 max-w-7xl mx-auto">
          <SectionHeader label="For Professionals & Students" title="Mannequins & Stands" cta="Shop All" to="/shop?category=Mannequins+%26+Stands" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mannequins.map(p => <ProductCard key={p._id} product={p} onPartnerClick={setPartnerNotice} />)}
          </div>
        </section>
      )}

      {/* Learn & Grow */}
      <section className="py-16 px-4 bg-black text-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Learn & Grow</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Training & Consultation</h2>
            <p className="text-gray-400 mb-3 leading-relaxed">Whether you want to build a business, develop new skills, or simply get expert advice on any of our products and services — we are here for you.</p>
            <ul className="text-gray-400 text-sm space-y-2 mb-6">
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Professional hands-on training sessions for beginners and advanced learners</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> One-on-one paid consultations for business, beauty and lifestyle goals</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Free consultation available — just reach out and ask</li>
              <li className="flex items-start gap-2"><span className="text-[#FDC700] font-extrabold mt-0.5">→</span> Importation assistance — we help you source and bring in products from abroad</li>
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
          <p className="text-black/70 text-sm mb-6 leading-relaxed">Get your product in front of thousands of customers across Ghana. Affordable subscription plans from 1 month. Your brand identity stays private.</p>
          <Link to="/services" className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white font-extrabold rounded-full hover:bg-gray-900 transition-all text-sm">
            Apply to Get Featured <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Partner stock notice modal */}
      {partnerNotice && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPartnerNotice(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} className="text-yellow-600" />
            </div>
            <h3 className="font-extrabold text-base text-center mb-1">Partner Product</h3>
            <p className="text-sm font-bold text-center mb-3">{partnerNotice.name}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-800 leading-relaxed space-y-1.5">
              <p>This product is fulfilled by a verified partner. You can order and pay normally.</p>
              {partnerNotice.updatedAt && (
                <p>Stock last updated: <span className="font-bold">{new Date(partnerNotice.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
              )}
              <p>If the item becomes unavailable after your payment, a full refund will be issued by Belle Kreyashon.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => {
                addToCart(partnerNotice, 1, false, null);
                setPartnerNotice(null);
                setToast(partnerNotice.name + ' added to cart!');
                setTimeout(() => setToast(''), 3000);
              }} className="w-full py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl hover:bg-yellow-300">
                Got It — Add to Cart
              </button>
              <button onClick={() => setPartnerNotice(null)} className="text-sm text-gray-400 hover:text-black text-center">Cancel</button>
            </div>
          </div>
        </div>
      )}


      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-black text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-pulse">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}