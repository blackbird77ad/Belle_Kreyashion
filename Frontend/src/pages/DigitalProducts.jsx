import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Download,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Zap,
} from 'lucide-react';
import SEO from '../components/SEO';
import { api } from '../hooks/useApi';
import {
  DIGITAL_DURATION_OPTIONS,
  DIGITAL_FORMAT_OPTIONS,
  DIGITAL_INCLUSION_OPTIONS,
  DIGITAL_PRICE_TYPE_OPTIONS,
  DIGITAL_SKILL_LEVEL_OPTIONS,
  DIGITAL_TOPIC_OPTIONS,
  DIGITAL_TYPE_OPTIONS,
  getDigitalOptionLabel,
} from '../data/digitalProductOptions';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
  { value: 'nameAsc', label: 'Name: A to Z' },
  { value: 'nameDesc', label: 'Name: Z to A' },
];

const SPECIAL_FILTERS = [
  { key: 'featured', label: 'Featured', icon: <Star size={13} /> },
  { key: 'fastSelling', label: 'Best Sellers', icon: <Zap size={13} /> },
  { key: 'discounted', label: 'On Sale', icon: <Tag size={13} /> },
];

const calcDiscountedPrice = (product) => {
  if (!product.discount?.active) return product.retailPrice;
  if (product.discount.type === 'percent') return Math.round(product.retailPrice * (1 - product.discount.value / 100));
  return Math.max(0, product.retailPrice - product.discount.value);
};

const formatType = (value) => {
  if (!value) return 'Digital Product';
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseListParam = (value) => (value ? value.split(',').filter(Boolean) : []);
const joinListParam = (values) => values.filter(Boolean).join(',');

const toggleListValue = (values, nextValue) => (
  values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
);

const FilterChipGroup = ({ title, options, values, onToggle }) => (
  <div className="space-y-3">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{title}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
              active
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-black'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default function DigitalProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [digitalType, setDigitalType] = useState(searchParams.get('digitalType') || 'all');
  const [skillLevel, setSkillLevel] = useState(searchParams.get('skillLevel') || 'all');
  const [formatFilter, setFormatFilter] = useState(searchParams.get('format') || 'all');
  const [durationFilter, setDurationFilter] = useState(searchParams.get('duration') || 'all');
  const [priceType, setPriceType] = useState(searchParams.get('priceType') || 'all');
  const [topics, setTopics] = useState(parseListParam(searchParams.get('topics')));
  const [inclusions, setInclusions] = useState(parseListParam(searchParams.get('inclusions')));
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [special, setSpecial] = useState(searchParams.get('filter') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setDigitalType(searchParams.get('digitalType') || 'all');
    setSkillLevel(searchParams.get('skillLevel') || 'all');
    setFormatFilter(searchParams.get('format') || 'all');
    setDurationFilter(searchParams.get('duration') || 'all');
    setPriceType(searchParams.get('priceType') || 'all');
    setTopics(parseListParam(searchParams.get('topics')));
    setInclusions(parseListParam(searchParams.get('inclusions')));
    setSort(searchParams.get('sort') || 'newest');
    setSpecial(searchParams.get('filter') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (digitalType !== 'all') params.set('digitalType', digitalType);
    if (skillLevel !== 'all') params.set('skillLevel', skillLevel);
    if (formatFilter !== 'all') params.set('format', formatFilter);
    if (durationFilter !== 'all') params.set('duration', durationFilter);
    if (priceType !== 'all') params.set('priceType', priceType);
    if (topics.length) params.set('topics', joinListParam(topics));
    if (inclusions.length) params.set('inclusions', joinListParam(inclusions));
    if (sort !== 'newest') params.set('sort', sort);
    if (special) params.set('filter', special);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    const nextString = params.toString();
    if (nextString !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    digitalType,
    durationFilter,
    formatFilter,
    inclusions,
    maxPrice,
    minPrice,
    priceType,
    search,
    searchParams,
    setSearchParams,
    skillLevel,
    sort,
    special,
    topics,
  ]);

  useEffect(() => {
    setLoading(true);
    setPage(1);

    const params = new URLSearchParams({
      category: 'Digital Products',
      isDigital: 'true',
    });

    if (search.trim()) params.set('search', search.trim());
    if (digitalType !== 'all') params.set('digitalType', digitalType);
    if (skillLevel !== 'all') params.set('digitalSkillLevel', skillLevel);
    if (formatFilter !== 'all') params.set('digitalFormat', formatFilter);
    if (durationFilter !== 'all') params.set('digitalDuration', durationFilter);
    if (priceType !== 'all') params.set('priceType', priceType);
    if (topics.length) params.set('digitalTopics', joinListParam(topics));
    if (inclusions.length) params.set('digitalInclusions', joinListParam(inclusions));
    if (sort) params.set('sort', sort);
    if (special === 'featured') params.set('featured', 'true');
    if (special === 'fastSelling') params.set('fastSelling', 'true');
    if (special === 'discounted') params.set('discounted', 'true');
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    api.get(`/api/products/public?${params.toString()}`)
      .then((response) => {
        setProducts(response.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [
    digitalType,
    durationFilter,
    formatFilter,
    inclusions,
    maxPrice,
    minPrice,
    priceType,
    search,
    skillLevel,
    sort,
    special,
    topics,
  ]);

  const clearAll = () => {
    setSearch('');
    setDigitalType('all');
    setSkillLevel('all');
    setFormatFilter('all');
    setDurationFilter('all');
    setPriceType('all');
    setTopics([]);
    setInclusions([]);
    setSort('newest');
    setSpecial('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const activeFilterCount = [
    search.trim(),
    digitalType !== 'all',
    skillLevel !== 'all',
    formatFilter !== 'all',
    durationFilter !== 'all',
    priceType !== 'all',
    topics.length,
    inclusions.length,
    sort !== 'newest',
    special,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(products.length / PAGE_SIZE);

  return (
    <div className="pt-16 min-h-screen bg-[#fcfbf7]">
      <SEO
        title="Digital Products"
        description="Browse Belle Kreyashon digital products with filters for skill level, format, duration, topic, inclusions, pricing and secure downloadable access."
        url="/digital-products"
      />

      <section className="bg-black text-white px-4 py-12">
        <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-[0.22em] mb-3">Digital Products</p>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">Protected downloads with clear filters for how people actually learn.</h1>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-2xl mt-4">
              Browse by skill level, format, duration, topic, certification, downloadable assets and pricing, then open the product page for secure access after payment.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                to="/digital-library"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FDC700] text-black text-sm font-extrabold hover:bg-yellow-300"
              >
                Open My Library
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/15 text-sm font-bold text-white hover:border-white"
              >
                Browse Full Shop
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: <ShieldCheck size={18} />, title: 'Protected access', text: 'Paid items unlock inside your customer library after payment.' },
              { icon: <Download size={18} />, title: 'Formats that fit', text: 'Filter for videos, tutorials, audio, bundles and other learning formats.' },
              { icon: <Lock size={18} />, title: 'Customer-only use', text: 'Access stays tied to the paying customer instead of being openly exposed.' },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-2xl bg-[#FDC700] text-black flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h2 className="font-extrabold text-sm mb-1">{item.title}</h2>
                <p className="text-xs text-gray-300 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search guides, videos, templates, coding resources and bundles..."
                className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-10 py-3 text-sm outline-none focus:border-black"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((current) => !current)}
              className="lg:hidden inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700"
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-black px-1 text-[11px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Sort By</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Digital Type</span>
                  <select
                    value={digitalType}
                    onChange={(event) => setDigitalType(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {DIGITAL_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Skill Level</span>
                  <select
                    value={skillLevel}
                    onChange={(event) => setSkillLevel(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {DIGITAL_SKILL_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Format</span>
                  <select
                    value={formatFilter}
                    onChange={(event) => setFormatFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {DIGITAL_FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto]">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Duration</span>
                  <select
                    value={durationFilter}
                    onChange={(event) => setDurationFilter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {DIGITAL_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Price Type</span>
                  <select
                    value={priceType}
                    onChange={(event) => setPriceType(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {DIGITAL_PRICE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
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
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Max Price</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="Any"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <div className="flex flex-col gap-1.5 justify-end">
                  <span className="hidden xl:block text-xs font-bold uppercase tracking-[0.16em] text-transparent">Reset</span>
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                  >
                    <RotateCcw size={15} />
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Quick Filters</p>
                  <p className="text-xs font-bold text-gray-500">
                    {!loading ? `${products.length} digital product${products.length !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SPECIAL_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSpecial((current) => current === filter.key ? '' : filter.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                        special === filter.key
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                      }`}
                    >
                      {filter.icon}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <FilterChipGroup
                title="Topic / Subject"
                options={DIGITAL_TOPIC_OPTIONS}
                values={topics}
                onToggle={(value) => setTopics((current) => toggleListValue(current, value))}
              />

              <FilterChipGroup
                title="Inclusions"
                options={DIGITAL_INCLUSION_OPTIONS}
                values={inclusions}
                onToggle={(value) => setInclusions((current) => toggleListValue(current, value))}
              />
            </div>
          </div>
        </div>

        {!loading && activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {search.trim() && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Search: {search.trim()}</span>}
            {digitalType !== 'all' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Type: {formatType(digitalType)}</span>}
            {skillLevel !== 'all' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Skill: {getDigitalOptionLabel(DIGITAL_SKILL_LEVEL_OPTIONS, skillLevel)}</span>}
            {formatFilter !== 'all' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Format: {getDigitalOptionLabel(DIGITAL_FORMAT_OPTIONS, formatFilter)}</span>}
            {durationFilter !== 'all' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Duration: {getDigitalOptionLabel(DIGITAL_DURATION_OPTIONS, durationFilter)}</span>}
            {priceType !== 'all' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Price Type: {getDigitalOptionLabel(DIGITAL_PRICE_TYPE_OPTIONS, priceType)}</span>}
            {topics.map((topic) => <span key={topic} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Topic: {getDigitalOptionLabel(DIGITAL_TOPIC_OPTIONS, topic)}</span>)}
            {inclusions.map((inclusion) => <span key={inclusion} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Inclusion: {getDigitalOptionLabel(DIGITAL_INCLUSION_OPTIONS, inclusion)}</span>)}
            {special && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Filter: {SPECIAL_FILTERS.find((item) => item.key === special)?.label}</span>}
            {sort !== 'newest' && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Sort: {SORT_OPTIONS.find((item) => item.value === sort)?.label}</span>}
            {minPrice && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Min: GHS {Number(minPrice).toLocaleString()}</span>}
            {maxPrice && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200">Max: GHS {Number(maxPrice).toLocaleString()}</span>}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-gray-100 bg-white animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-10 bg-gray-100 rounded-2xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-14 text-center">
            <BookOpen size={38} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-extrabold mb-2">No digital products found</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
              Try a different skill level, format, topic, inclusion or price range, or clear the filters to see everything available.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={clearAll}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
              >
                Reset Filters
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
              >
                Back To Shop
              </Link>
            </div>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {pagedProducts.map((product) => {
                const discounted = product.discount?.active;
                const finalPrice = calcDiscountedPrice(product);
                const isFreeDigital = product.digitalAccessKind === 'free';
                const isTrialDigital = product.digitalAccessKind === 'trial';

                return (
                  <Link
                    key={product._id}
                    to={`/shop/${product._id}`}
                    className={`group overflow-hidden rounded-3xl border-2 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      discounted ? 'border-[#FDC700]' : 'border-gray-100'
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f7f0d7] via-white to-gray-100">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                          onError={(event) => { event.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <BookOpen size={36} />
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-1 text-[11px] font-extrabold text-[#FDC700]">
                          {formatType(product.digitalType)}
                        </span>
                        {product.digitalFormat && (
                          <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-gray-700">
                            {getDigitalOptionLabel(DIGITAL_FORMAT_OPTIONS, product.digitalFormat)}
                          </span>
                        )}
                        {product.isCertified && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 border border-amber-100">
                            Certified
                          </span>
                        )}
                        {discounted && (
                          <span className="inline-flex items-center rounded-full bg-[#FDC700] px-2.5 py-1 text-[11px] font-extrabold text-black">
                            Sale
                          </span>
                        )}
                      </div>

                      <div className="absolute right-3 bottom-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
                        {product.digitalFileCount || 0} file{product.digitalFileCount === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 mb-2">
                        <ShieldCheck size={13} className="text-[#B88900]" />
                        Secure digital access
                      </div>

                      <h2 className="text-lg font-extrabold leading-tight mb-2 line-clamp-2">{product.name}</h2>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {product.digitalSkillLevel && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                            {getDigitalOptionLabel(DIGITAL_SKILL_LEVEL_OPTIONS, product.digitalSkillLevel)}
                          </span>
                        )}
                        {product.digitalDuration && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                            {getDigitalOptionLabel(DIGITAL_DURATION_OPTIONS, product.digitalDuration)}
                          </span>
                        )}
                        {(product.digitalTopics || []).slice(0, 2).map((topic) => (
                          <span key={topic} className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold text-[#9a7a00] border border-[#FDC700]/25">
                            {getDigitalOptionLabel(DIGITAL_TOPIC_OPTIONS, topic)}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 min-h-[4rem]">
                        {product.desc || product.certificateDescription || product.accessNote || 'Open this digital product to view the full description and secure purchase details.'}
                      </p>

                      {(product.digitalInclusions || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.digitalInclusions.slice(0, 3).map((inclusion) => (
                            <span key={inclusion} className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                              {getDigitalOptionLabel(DIGITAL_INCLUSION_OPTIONS, inclusion)}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">Price</p>
                          {isFreeDigital ? (
                            <span className="text-xl font-extrabold text-emerald-600">Free</span>
                          ) : isTrialDigital ? (
                            <div className="space-y-0.5">
                              <span className="text-lg font-extrabold text-black">{product.freeTrialDays || 7}-day free trial</span>
                              <p className="text-xs text-gray-500">Then GHS {finalPrice?.toLocaleString()}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl font-extrabold text-black">GHS {finalPrice?.toLocaleString()}</span>
                              {discounted && (
                                <span className="text-xs text-gray-400 line-through">
                                  GHS {product.retailPrice?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-extrabold text-white transition-colors group-hover:bg-[#1f1f1f]">
                          Open Product
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page === 1}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold hover:border-black disabled:opacity-40"
                >
                  Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, page - 3), page + 2)
                    .map((nextPage) => (
                      <button
                        key={nextPage}
                        onClick={() => {
                          setPage(nextPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                          page === nextPage ? 'bg-black text-white' : 'border-2 border-gray-200 hover:border-black'
                        }`}
                      >
                        {nextPage}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => {
                    setPage((current) => Math.min(totalPages, current + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page === totalPages}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold hover:border-black disabled:opacity-40"
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
