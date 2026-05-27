import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Tag,
  Zap,
  Star,
  Clock,
  Package,
  SlidersHorizontal,
  ArrowDownUp,
  RotateCcw,
} from 'lucide-react';
import { api } from '../hooks/useApi';
import { CATEGORIES } from '../data/categories';
import SEO from '../components/SEO';

const calcDiscountedPrice = (p) => {
  if (!p.discount?.active) return p.retailPrice;
  if (p.discount.type === 'percent') return Math.round(p.retailPrice * (1 - p.discount.value / 100));
  return Math.max(0, p.retailPrice - p.discount.value);
};

const SPECIAL_FILTERS = [
  { key: 'featured', label: 'Featured', icon: <Star size={13} />, color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  { key: 'fastSelling', label: 'Fast Selling', icon: <Zap size={13} />, color: 'bg-red-50 text-red-600 border-red-300' },
  { key: 'isPreOrder', label: 'Pre-Order', icon: <Clock size={13} />, color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { key: 'discounted', label: 'On Sale', icon: <Tag size={13} />, color: 'bg-green-50 text-green-700 border-green-300' },
  { key: 'outOfStock', label: 'Out of Stock', icon: <Package size={13} />, color: 'bg-gray-100 text-gray-600 border-gray-300' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
  { value: 'nameAsc', label: 'Name: A to Z' },
  { value: 'nameDesc', label: 'Name: Z to A' },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [special, setSpecial] = useState(searchParams.get('filter') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 16;

  useEffect(() => {
    setCategory(searchParams.get('category') || 'All');
    setSpecial(searchParams.get('filter') || '');
    setSearch(searchParams.get('search') || '');
    setSort(searchParams.get('sort') || 'newest');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    if (special) params.set('filter', special);
    if (sort !== 'newest') params.set('sort', sort);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    const nextString = params.toString();
    if (nextString !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [category, search, special, sort, minPrice, maxPrice, searchParams, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    if (special === 'featured') params.set('featured', 'true');
    if (special === 'fastSelling') params.set('fastSelling', 'true');
    if (special === 'isPreOrder') params.set('isPreOrder', 'true');
    if (special === 'discounted') params.set('discounted', 'true');
    if (special === 'outOfStock') params.set('outOfStock', 'true');
    if (sort) params.set('sort', sort);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    api.get(`/api/products/public?${params.toString()}`)
      .then((r) => {
        setProducts(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, search, special, sort, minPrice, maxPrice]);

  const setFilter = (key) => {
    setSpecial((current) => current === key ? '' : key);
    setPage(1);
  };

  const clearAll = () => {
    setSearch('');
    setCategory('All');
    setSpecial('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const activeFilterCount = [
    search.trim(),
    category !== 'All',
    special,
    sort !== 'newest',
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(products.length / PAGE_SIZE);

  return (
    <div className="pt-16 min-h-screen">
      <SEO
        title="Shop Hair, Beauty, Fashion & More"
        description="Browse hundreds of products - hair extensions, wigs, braiding hair, skincare, fashion, health and gadgets. Fast delivery across Ghana."
        url="/shop"
      />

      <div className="bg-black text-white py-12 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Belle Kreyashon</p>
        <h1 className="text-3xl md:text-5xl font-extrabold">Shop</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-black bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 lg:w-auto">
              <button
                onClick={() => setShowFilters((current) => !current)}
                className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-700"
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-black text-white text-[11px]">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500 font-bold px-4">
                <ArrowDownUp size={15} />
                Sort, filter and price range
              </div>
            </div>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="rounded-3xl border border-gray-200 bg-[#fcfbf7] p-4 sm:p-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_auto]">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Sort By</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Min Price</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Max Price</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Any"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <div className="flex flex-col gap-1.5 justify-end">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-transparent hidden xl:block">Reset</span>
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                  >
                    <RotateCcw size={15} />
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Quick Filters</p>
                <div className="flex gap-2 flex-wrap">
                  {SPECIAL_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${special === f.key ? `${f.color} border-current` : 'border-gray-200 text-gray-500 bg-white hover:border-gray-400'}`}
                    >
                      {f.icon} {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Browse Categories</p>
                  <p className="text-xs text-gray-500 font-bold">
                    {!loading ? `${products.length} product${products.length !== 1 ? 's' : ''} found` : 'Loading products...'}
                  </p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setCategory(item.value);
                        setPage(1);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all shrink-0 ${category === item.value ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black bg-white'}`}
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!loading && activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {search.trim() && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Search: {search.trim()}</span>}
            {category !== 'All' && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Category: {category}</span>}
            {special && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Filter: {SPECIAL_FILTERS.find((item) => item.key === special)?.label}</span>}
            {sort !== 'newest' && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Sort: {SORT_OPTIONS.find((item) => item.value === sort)?.label}</span>}
            {minPrice && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Min: GHS {Number(minPrice).toLocaleString()}</span>}
            {maxPrice && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700">Max: GHS {Number(maxPrice).toLocaleString()}</span>}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">Shop</div>
            <p className="text-gray-400 font-bold">No products found</p>
            <button
              onClick={clearAll}
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white font-bold text-sm hover:bg-gray-900"
            >
              Reset Filters
            </button>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {pagedProducts.map((product, i) => {
                  const discounted = product.discount?.active;
                  const finalPrice = calcDiscountedPrice(product);
                  const outOfStock = product.stock === 0;
                  const isFreeDigital = product.isDigital && product.digitalAccessKind === 'free';
                  const isTrialDigital = product.isDigital && product.digitalAccessKind === 'trial';
                  return (
                    <motion.div
                      key={product._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.15) }}
                    >
                      <Link
                        to={`/shop/${product._id}`}
                        className={`block bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 ${discounted ? 'border-[#FDC700]' : 'border-gray-100'}`}
                      >
                        <div className="relative aspect-square bg-gray-100 overflow-hidden">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          {discounted && (
                            <div className="absolute top-0 left-0 bg-[#FDC700] text-black font-extrabold px-3 py-1 text-xs rounded-br-xl">
                              -{product.discount.value}{product.discount.type === 'percent' ? '%' : ' GHS'} OFF
                            </div>
                          )}
                          {product.isPreOrder && !discounted && (
                            <span className="absolute top-2 left-2 bg-black text-white text-xs font-extrabold px-2 py-0.5 rounded-full">
                              Pre-Order
                            </span>
                          )}
                          {product.isDigital && (
                            <span className="absolute top-2 right-2 bg-black/85 text-[#FDC700] text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                              Digital
                            </span>
                          )}
                          {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                            <span className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              Only {product.stock} left
                            </span>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-extrabold text-sm bg-black/70 px-3 py-1 rounded-full">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className={`p-3 ${discounted ? 'bg-yellow-50/30' : ''}`}>
                          <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
                          <h3 className="font-extrabold text-sm leading-tight line-clamp-2 mb-1">{product.name}</h3>
                          {isFreeDigital ? (
                            <p className="font-extrabold text-base text-emerald-600">Free</p>
                          ) : isTrialDigital ? (
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-base text-black">{product.freeTrialDays || 7}-day free trial</p>
                              <p className="text-xs text-gray-400">Then GHS {finalPrice?.toLocaleString()}</p>
                            </div>
                          ) : discounted ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-base text-black">GHS {finalPrice?.toLocaleString()}</p>
                              <p className="text-xs text-gray-400 line-through">GHS {product.retailPrice?.toLocaleString()}</p>
                              <span className="text-xs bg-[#FDC700] text-black font-extrabold px-1.5 py-0.5 rounded-full">
                                {product.discount.value}{product.discount.type === 'percent' ? '% off' : ' GHS off'}
                              </span>
                            </div>
                          ) : (
                            <p className="font-extrabold text-base">GHS {product.retailPrice?.toLocaleString()}</p>
                          )}
                          {product.isDigital ? (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isFreeDigital ? 'Secure access with no payment' : isTrialDigital ? 'Card setup required before trial starts' : 'Secure access after payment'}
                            </p>
                          ) : (
                            product.stock !== null && <p className="text-xs text-gray-400 mt-0.5">{outOfStock ? 'Out of stock' : `${product.stock} in stock`}</p>
                          )}
                          {product.wholesalePrice && <p className="text-xs text-[#FDC700] font-bold mt-0.5">Wholesale available</p>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40"
                >
                  Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-black text-white' : 'border-2 border-gray-200 hover:border-black'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setPage((current) => Math.min(totalPages, current + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
