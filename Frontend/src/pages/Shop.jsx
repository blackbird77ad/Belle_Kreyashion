import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { api } from '../hooks/useApi';
import { CATEGORIES } from '../data/categories';

const calcDiscountedPrice = (p) => {
  if (!p.discount?.active) return p.retailPrice;
  if (p.discount.type === 'percent') return Math.round(p.retailPrice * (1 - p.discount.value / 100));
  return Math.max(0, p.retailPrice - p.discount.value);
};

export default function Shop() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 16;

  useEffect(() => {
    setCategory(searchParams.get('category') || 'All');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    api.get(`/api/products/public?${params}`)
      .then(r => { setProducts(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-black text-white py-12 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Belle Kreyashon</p>
        <h1 className="text-3xl md:text-5xl font-extrabold">Shop</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
        </div>

        {/* Category filter — image pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 hide-scroll">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all shrink-0 ${category === c.value ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black bg-white'}`}>
              {c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
              {c.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3"><div className="h-4 bg-gray-200 rounded mb-2" /><div className="h-3 bg-gray-100 rounded w-3/4" /></div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination info */}
        {!loading && products.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-gray-400">{products.length} product{products.length !== 1 ? 's' : ''} found</p>
            {Math.ceil(products.length / PAGE_SIZE) > 1 && (
              <p className="text-xs text-gray-400">Page {page} of {Math.ceil(products.length / PAGE_SIZE)}</p>
            )}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="text-gray-400 font-bold">No products found</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {products.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((product, i) => {
                const discounted = product.discount?.active;
                const finalPrice = calcDiscountedPrice(product);
                return (
                  <motion.div key={product._id} layout
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.15) }}>
                    <Link to={`/shop/${product._id}`}
                      className={`block bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 ${discounted ? 'border-[#FDC700]' : 'border-gray-100'}`}>
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
                        {discounted && <span className="absolute top-2 left-2 bg-[#FDC700] text-black text-xs font-extrabold px-2 py-0.5 rounded-full">-{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'}</span>}
                        {product.isPreOrder && <span className="absolute top-2 right-2 bg-black text-white text-xs font-extrabold px-2 py-0.5 rounded-full">Pre-Order</span>}
                        {product.stock !== null && product.stock <= 5 && product.stock > 0 && <span className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Only {product.stock} left</span>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
                        <h3 className="font-extrabold text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-base">GHS {finalPrice?.toLocaleString()}</p>
                          {discounted && <p className="text-xs text-gray-400 line-through">GHS {product.retailPrice?.toLocaleString()}</p>}
                        </div>
                        {product.wholesalePrice && <p className="text-xs text-[#FDC700] font-bold mt-0.5">Wholesale available</p>}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Paginator */}
        {!loading && Math.ceil(products.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => { setPage(p => Math.max(1,p-1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={page===1}
              className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40 transition-all">← Prev</button>
            <div className="flex gap-1">
              {Array.from({length: Math.ceil(products.length / PAGE_SIZE)}, (_,i) => i+1).map(p => (
                <button key={p} onClick={() => { setPage(p); window.scrollTo({top:0,behavior:'smooth'}); }}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page===p ? 'bg-black text-white' : 'border-2 border-gray-200 hover:border-black'}`}>{p}</button>
              ))}
            </div>
            <button onClick={() => { setPage(p => Math.min(Math.ceil(products.length/PAGE_SIZE),p+1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={page===Math.ceil(products.length/PAGE_SIZE)}
              className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40 transition-all">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}