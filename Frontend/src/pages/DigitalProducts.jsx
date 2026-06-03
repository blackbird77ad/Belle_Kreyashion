import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Zap,
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useIntlPreferences } from '../context/IntlContext';
import { api } from '../hooks/useApi';
import { buildBreadcrumbSchema, buildCollectionPageSchema, getProductPath } from '../utils/seoPaths';
import { buildDiscountPresentation } from '../utils/discounts';
import {
  DIGITAL_DURATION_OPTIONS,
  DIGITAL_FORMAT_OPTIONS,
  DIGITAL_INCLUSION_OPTIONS,
  DIGITAL_PRICE_TYPE_OPTIONS,
  DIGITAL_SKILL_LEVEL_OPTIONS,
  DIGITAL_TOPIC_OPTIONS,
  DIGITAL_TYPE_OPTIONS,
  getDigitalOptionLabel,
  mergeDigitalOptions,
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

const FilterToggle = ({ label, count = 0, open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
      open
        ? 'border-black bg-black text-white'
        : 'border-gray-200 bg-[#fcfbf7] text-gray-700 hover:border-black hover:text-black'
    }`}
  >
    <span>{label}</span>
    {count > 0 && (
      <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
        open ? 'bg-white/15 text-white' : 'bg-black text-white'
      }`}>
        {count}
      </span>
    )}
    <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

const FilterPanel = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-[#fcfbf7] p-3">
    <div className="mb-2.5">
      <p className="text-[13px] font-extrabold text-black">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export default function DigitalProducts() {
  const { customer } = useCustomer();
  const { removeOwnedDigitalItems } = useCart();
  const { formatMoney, formatBaseMoney } = useIntlPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
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
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1));
  const [showFilters, setShowFilters] = useState(false);
  const [openFilterPanels, setOpenFilterPanels] = useState({
    basics: false,
    sortPrice: false,
    quick: false,
    topics: false,
    inclusions: false,
  });
  const [optionCatalog, setOptionCatalog] = useState({
    digitalTypes: [],
    digitalSkillLevels: [],
    digitalFormats: [],
    digitalDurations: [],
    digitalTopics: [],
    digitalInclusions: [],
  });
  const PAGE_SIZE = 20;

  const digitalTypeOptions = mergeDigitalOptions(
    DIGITAL_TYPE_OPTIONS,
    [...optionCatalog.digitalTypes, digitalType].filter(Boolean)
  );
  const skillLevelOptions = mergeDigitalOptions(
    DIGITAL_SKILL_LEVEL_OPTIONS,
    [...optionCatalog.digitalSkillLevels, skillLevel].filter(Boolean)
  );
  const formatOptions = mergeDigitalOptions(
    DIGITAL_FORMAT_OPTIONS,
    [...optionCatalog.digitalFormats, formatFilter].filter(Boolean)
  );
  const durationOptions = mergeDigitalOptions(
    DIGITAL_DURATION_OPTIONS,
    [...optionCatalog.digitalDurations, durationFilter].filter(Boolean)
  );
  const topicOptions = mergeDigitalOptions(
    DIGITAL_TOPIC_OPTIONS,
    [...optionCatalog.digitalTopics, ...topics].filter(Boolean)
  );
  const inclusionOptions = mergeDigitalOptions(
    DIGITAL_INCLUSION_OPTIONS,
    [...optionCatalog.digitalInclusions, ...inclusions].filter(Boolean)
  );

  useEffect(() => {
    api.get('/api/products/digital/options')
      .then((response) => {
        setOptionCatalog({
          digitalTypes: Array.isArray(response.data?.digitalTypes) ? response.data.digitalTypes : [],
          digitalSkillLevels: Array.isArray(response.data?.digitalSkillLevels) ? response.data.digitalSkillLevels : [],
          digitalFormats: Array.isArray(response.data?.digitalFormats) ? response.data.digitalFormats : [],
          digitalDurations: Array.isArray(response.data?.digitalDurations) ? response.data.digitalDurations : [],
          digitalTopics: Array.isArray(response.data?.digitalTopics) ? response.data.digitalTopics : [],
          digitalInclusions: Array.isArray(response.data?.digitalInclusions) ? response.data.digitalInclusions : [],
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const syncFiltersFromQuery = () => {
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
      setPage(Math.max(1, Number(searchParams.get('page')) || 1));
    };

    syncFiltersFromQuery();
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
    if (page > 1) params.set('page', String(page));
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
    page,
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
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);

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

      try {
        const response = await api.get(`/api/products/public?${params.toString()}`, customer?.accessToken
          ? { headers: { 'x-customer-token': customer.accessToken } }
          : undefined);
        if (!cancelled) {
          const nextProducts = Array.isArray(response.data) ? response.data : [];
          setProducts(
            special === 'discounted'
              ? nextProducts.filter((product) => buildDiscountPresentation(product.retailPrice, product.discount || {}, { respectLiveState: true }).discounted)
              : nextProducts
          );
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
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
    customer?.accessToken,
  ]);

  useEffect(() => {
    const ownedProductIds = products
      .filter((product) => product?.isDigital && product?.customerHasAccess && product?._id)
      .map((product) => product._id);

    if (!ownedProductIds.length) return;
    removeOwnedDigitalItems(ownedProductIds);
  }, [products, removeOwnedDigitalItems]);

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

  const toggleFilterPanel = (panelKey) => {
    setOpenFilterPanels((current) => ({
      ...current,
      [panelKey]: !current[panelKey],
    }));
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

  const panelCounts = {
    basics: [
      digitalType !== 'all',
      skillLevel !== 'all',
      formatFilter !== 'all',
    ].filter(Boolean).length,
    sortPrice: [
      sort !== 'newest',
      durationFilter !== 'all',
      priceType !== 'all',
      minPrice,
      maxPrice,
    ].filter(Boolean).length,
    quick: special ? 1 : 0,
    topics: topics.length,
    inclusions: inclusions.length,
  };
  const activeSortLabel = SORT_OPTIONS.find((item) => item.value === sort)?.label || 'Newest First';
  const activeTypeLabel = getDigitalOptionLabel(digitalTypeOptions, digitalType) || 'All Types';
  const activeSkillLevelLabel = getDigitalOptionLabel(skillLevelOptions, skillLevel) || 'All Skill Levels';
  const activeFormatLabel = getDigitalOptionLabel(formatOptions, formatFilter) || 'All Formats';
  const activeDurationLabel = getDigitalOptionLabel(durationOptions, durationFilter) || 'Any Duration';
  const activePriceTypeLabel = getDigitalOptionLabel(DIGITAL_PRICE_TYPE_OPTIONS, priceType) || 'Any Price Type';
  const activeTopicSummary = topics.length
    ? topics.slice(0, 2).map((topic) => getDigitalOptionLabel(topicOptions, topic)).join(' | ')
    : 'Filter by subject';
  const activeInclusionSummary = inclusions.length
    ? inclusions.slice(0, 2).map((inclusion) => getDigitalOptionLabel(inclusionOptions, inclusion)).join(' | ')
    : 'Filter by what is included';

  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const activeSpecialLabel = SPECIAL_FILTERS.find((item) => item.key === special)?.label || '';
  const seoTitle = search.trim()
    ? `${search.trim()} Digital Products`
    : digitalType !== 'all'
        ? `${formatType(digitalType)} Digital Products`
        : skillLevel !== 'all'
        ? `${getDigitalOptionLabel(skillLevelOptions, skillLevel)} Digital Products`
        : 'Digital Products';
  const seoDescription = search.trim()
    ? `Browse Belle Kreyashon digital products for ${search.trim()} with secure access, guided learning, and Ghana-friendly checkout.`
    : 'Browse Belle Kreyashon digital products with filters for skill level, format, duration, topic, inclusions, pricing and secure library access.';
  const seoKeywords = [
    'digital products Ghana',
    'online beauty courses Ghana',
    'downloadable training Ghana',
    'secure digital library',
    'Belle Kreyashon academy',
    digitalType !== 'all' ? formatType(digitalType) : '',
    skillLevel !== 'all' ? getDigitalOptionLabel(skillLevelOptions, skillLevel) : '',
    search.trim(),
    activeSpecialLabel,
  ].filter(Boolean).join(', ');
  const seoSchema = [
    buildCollectionPageSchema({
      name: seoTitle,
      description: seoDescription,
      path: '/digital-products',
    }),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Digital Products', path: '/digital-products' },
    ]),
  ];

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="pt-16 min-h-screen bg-[#fcfbf7]">
      <SEO
        title={seoTitle}
        description={seoDescription}
        url="/digital-products"
        keywords={seoKeywords}
        schema={seoSchema}
      />

      <section className="bg-black px-4 py-6 text-white md:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#FDC700]">Digital Products</p>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
              Find digital guides, classes, templates and tools that match your level.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base">
              Use quick filters for topic, format, price and skill level, then open any product for full details before you buy.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Guides</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Templates</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Courses</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Bundles</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/digital-library"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FDC700] px-5 py-3 text-sm font-extrabold text-black hover:bg-yellow-300"
              >
                Open My Library
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-white hover:border-white"
              >
                Browse Full Shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:py-8">
        <div className="mb-5 rounded-[1.75rem] border border-gray-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                {customer?.accessToken ? 'Customer Session Active' : 'Check Your Access'}
              </p>
              <h2 className="mt-1 text-base font-extrabold text-black sm:text-lg">
                {customer?.accessToken
                  ? `Signed in${customer?.name ? ` as ${customer.name}` : ''}`
                  : 'Sign in to see which digital products you already own'}
              </h2>
              <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500 sm:text-[13px]">
                {customer?.accessToken
                  ? 'Owned products carry a badge here. Open a cover for details, then continue in your library.'
                  : 'Use your customer details to reconnect, confirm your existing digital access, and browse these digital covers without guessing what you already bought.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {customer?.accessToken ? (
                <Link
                  to="/digital-library"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-xs font-extrabold text-white hover:bg-gray-900 sm:text-sm"
                >
                  Open My Library
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-xs font-extrabold text-white hover:bg-gray-900 sm:text-sm"
                >
                  Sign In As Customer
                </button>
              )}
              <Link
                to="/track"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black sm:text-sm"
              >
                View Orders
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-5 space-y-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search guides, videos, templates, coding resources and bundles..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-black"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 lg:hidden sm:text-sm"
            >
              <SlidersHorizontal size={16} />
              Refine
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-black px-1 text-[11px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <FilterToggle
                    label="Core Filters"
                    count={panelCounts.basics}
                    open={openFilterPanels.basics}
                    onClick={() => toggleFilterPanel('basics')}
                  />
                  <FilterToggle
                    label="Sort & Price"
                    count={panelCounts.sortPrice}
                    open={openFilterPanels.sortPrice}
                    onClick={() => toggleFilterPanel('sortPrice')}
                  />
                  <FilterToggle
                    label="Quick Picks"
                    count={panelCounts.quick}
                    open={openFilterPanels.quick}
                    onClick={() => toggleFilterPanel('quick')}
                  />
                  <FilterToggle
                    label="Topics"
                    count={panelCounts.topics}
                    open={openFilterPanels.topics}
                    onClick={() => toggleFilterPanel('topics')}
                  />
                  <FilterToggle
                    label="What's Included"
                    count={panelCounts.inclusions}
                    open={openFilterPanels.inclusions}
                    onClick={() => toggleFilterPanel('inclusions')}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-gray-500">
                    {!loading ? `${products.length} result${products.length !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#fcfbf7] px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black sm:text-sm"
                  >
                    <RotateCcw size={15} />
                    Clear All
                  </button>
                </div>
              </div>

              {(openFilterPanels.basics || openFilterPanels.sortPrice || openFilterPanels.quick || openFilterPanels.topics || openFilterPanels.inclusions) && (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {openFilterPanels.basics && (
                    <FilterPanel
                      title="Core Filters"
                      subtitle={`Type: ${activeTypeLabel} | Level: ${activeSkillLevelLabel} | Format: ${activeFormatLabel}`}
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Digital Type</span>
                          <select
                            value={digitalType}
                            onChange={(event) => setDigitalType(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {digitalTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Skill Level</span>
                          <select
                            value={skillLevel}
                            onChange={(event) => setSkillLevel(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {skillLevelOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Format</span>
                          <select
                            value={formatFilter}
                            onChange={(event) => setFormatFilter(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {formatOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </FilterPanel>
                  )}

                  {openFilterPanels.sortPrice && (
                    <FilterPanel
                      title="Sort & Price"
                      subtitle={`Sort: ${activeSortLabel} | Duration: ${activeDurationLabel} | Price: ${activePriceTypeLabel}`}
                    >
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Sort By</span>
                          <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {SORT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Duration</span>
                          <select
                            value={durationFilter}
                            onChange={(event) => setDurationFilter(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {durationOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Price Type</span>
                          <select
                            value={priceType}
                            onChange={(event) => setPriceType(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          >
                            {DIGITAL_PRICE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Min Price (GHS)</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                            placeholder="0"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          />
                        </label>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Max Price (GHS)</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                            placeholder="Any"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-black"
                          />
                        </label>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-gray-500">
                        Price filters use Ghana cedis (GHS). Product cards below convert automatically to your selected display currency.
                      </p>
                    </FilterPanel>
                  )}

                  {openFilterPanels.quick && (
                    <FilterPanel
                      title="Quick Picks"
                      subtitle="Tap one to narrow the list faster."
                    >
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
                    </FilterPanel>
                  )}

                  {openFilterPanels.topics && (
                    <div className="xl:col-span-2">
                      <FilterPanel
                        title="Topics"
                        subtitle={activeTopicSummary}
                      >
                        <FilterChipGroup
                          title="Topic / Subject"
                          options={topicOptions}
                          values={topics}
                          onToggle={(value) => setTopics((current) => toggleListValue(current, value))}
                        />
                      </FilterPanel>
                    </div>
                  )}

                  {openFilterPanels.inclusions && (
                    <div className="xl:col-span-2">
                      <FilterPanel
                        title="What's Included"
                        subtitle={activeInclusionSummary}
                      >
                        <FilterChipGroup
                          title="Included"
                          options={inclusionOptions}
                          values={inclusions}
                          onToggle={(value) => setInclusions((current) => toggleListValue(current, value))}
                        />
                      </FilterPanel>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {!loading && activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {search.trim() && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Search: {search.trim()}</span>}
            {digitalType !== 'all' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Type: {formatType(digitalType)}</span>}
            {skillLevel !== 'all' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Skill: {getDigitalOptionLabel(skillLevelOptions, skillLevel)}</span>}
            {formatFilter !== 'all' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Format: {getDigitalOptionLabel(formatOptions, formatFilter)}</span>}
            {durationFilter !== 'all' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Duration: {getDigitalOptionLabel(durationOptions, durationFilter)}</span>}
            {priceType !== 'all' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Price Type: {getDigitalOptionLabel(DIGITAL_PRICE_TYPE_OPTIONS, priceType)}</span>}
            {topics.map((topic) => <span key={topic} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Topic: {getDigitalOptionLabel(topicOptions, topic)}</span>)}
            {inclusions.map((inclusion) => <span key={inclusion} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Inclusion: {getDigitalOptionLabel(inclusionOptions, inclusion)}</span>)}
            {special && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Filter: {SPECIAL_FILTERS.find((item) => item.key === special)?.label}</span>}
            {sort !== 'newest' && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Sort: {SORT_OPTIONS.find((item) => item.value === sort)?.label}</span>}
            {minPrice && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Min: {formatBaseMoney(Number(minPrice))}</span>}
            {maxPrice && <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">Max: {formatBaseMoney(Number(maxPrice))}</span>}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[24px] border border-gray-100 bg-white animate-pulse">
                <div className="aspect-[5/6] bg-gray-200" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 rounded bg-gray-200" />
                  <div className="h-2.5 w-3/4 rounded bg-gray-100" />
                  <div className="h-8 bg-gray-100 rounded-full mt-3" />
                  <div className="mt-3 h-9 rounded-xl bg-gray-100" />
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Page {page} of {totalPages}
              </p>
              <p className="text-xs text-gray-500">
                Open a cover to view full details before checkout or before jumping into your library.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {pagedProducts.map((product) => {
                const discountPreview = buildDiscountPresentation(product.retailPrice, product.discount || {}, { respectLiveState: true });
                const discounted = discountPreview.discounted;
                const finalPrice = discounted ? discountPreview.finalPrice : product.retailPrice;
                const isFreeDigital = product.digitalAccessKind === 'free';
                const isTrialDigital = product.digitalAccessKind === 'trial';
                const customerHasAccess = !!product.customerHasAccess;
                const customerOwnedPrice = Number.isFinite(Number(product.customerOwnedPrice))
                  ? Number(product.customerOwnedPrice)
                  : null;
                const customerOwnedAccessKind = product.customerOwnedAccessKind || (customerHasAccess ? product.digitalAccessKind : '');
                const customerTrialIsActive = customerOwnedAccessKind === 'trial' && product.customerOwnedTrialStatus === 'trialing';
                const liveSellingText = isFreeDigital
                  ? 'Now selling as free access'
                  : isTrialDigital
                    ? `Now selling as ${product.freeTrialDays || 7}-day free trial${finalPrice > 0 ? `, then ${formatMoney(finalPrice)}` : ''}`
                    : `Now selling at ${formatMoney(finalPrice)}`;

                return (
                  <Link
                    key={product._id}
                    to={getProductPath(product)}
                    className={`group overflow-hidden rounded-[24px] border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(17,24,39,0.1)] ${
                      customerHasAccess ? 'border-emerald-300' : discounted ? 'border-[#FDC700]' : 'border-gray-100'
                    }`}
                  >
                    <div className="relative aspect-[5/6] overflow-hidden bg-[radial-gradient(circle_at_top,_#fff9df_0%,_#f8f3e6_58%,_#f2ede2_100%)]">
                      <div className="absolute inset-y-0 left-0 w-1.5 bg-black/80" />
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                          onError={(event) => { event.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <BookOpen size={36} />
                        </div>
                      )}

                      <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-black px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#FDC700]">
                          {formatType(product.digitalType)}
                        </span>
                        {product.digitalFormat && (
                          <span className="inline-flex items-center rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-700">
                            {getDigitalOptionLabel(formatOptions, product.digitalFormat)}
                          </span>
                        )}
                        {product.isCertified && (
                          <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-700">
                            Certified
                          </span>
                        )}
                        {customerHasAccess && (
                          <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                            Owned
                          </span>
                        )}
                        {discounted && (
                          <span className="inline-flex items-center rounded-full bg-[#FDC700] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-black">
                            {discountPreview.label || 'Sale'}
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent px-2.5 pb-2.5 pt-8">
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                          {product.digitalModuleCount > 0 && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                              {product.digitalModuleCount} module{product.digitalModuleCount === 1 ? '' : 's'}
                            </span>
                          )}
                          {product.digitalFileCount > 0 && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                              {product.digitalFileCount} file{product.digitalFileCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        <ShieldCheck size={12} className="text-[#B88900]" />
                        {customerHasAccess ? 'Owned Access' : 'Secure Digital Access'}
                      </div>

                      <h2 className="mt-1.5 min-h-[2.4rem] text-[0.94rem] font-extrabold leading-tight line-clamp-2">{product.name}</h2>
                      <p className="mt-1.5 min-h-[2.35rem] text-[11px] leading-[1.15rem] text-gray-500 line-clamp-2">
                        {product.desc || product.certificateDescription || product.accessNote || 'Open this digital product to view the full description and secure purchase details.'}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {product.digitalSkillLevel && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-600">
                            {getDigitalOptionLabel(skillLevelOptions, product.digitalSkillLevel)}
                          </span>
                        )}
                        {product.digitalDuration && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-600">
                            {getDigitalOptionLabel(durationOptions, product.digitalDuration)}
                          </span>
                        )}
                        {(product.digitalTopics || []).slice(0, 2).map((topic) => (
                          <span key={topic} className="rounded-full border border-[#FDC700]/25 bg-[#fcfbf7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a7a00]">
                            {getDigitalOptionLabel(topicOptions, topic)}
                          </span>
                        ))}
                      </div>

                      {(product.digitalInclusions || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {product.digitalInclusions.slice(0, 2).map((inclusion) => (
                            <span key={inclusion} className="rounded-full border border-gray-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500">
                              {getDigitalOptionLabel(inclusionOptions, inclusion)}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        {product.digitalModuleCount > 0 && (
                          <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2 py-0.5">
                            {product.digitalModuleItemCount || 0} lesson item{product.digitalModuleItemCount === 1 ? '' : 's'}
                          </span>
                        )}
                        {product.downloadableDigitalFileCount > 0 && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                            {product.downloadableDigitalFileCount} download{product.downloadableDigitalFileCount === 1 ? '' : 's'}
                          </span>
                        )}
                        {!product.downloadableDigitalFileCount && product.digitalFileCount > 0 && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                            View-only files
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">Price</p>
                          {customerHasAccess ? (
                            <div className="space-y-1">
                              {customerTrialIsActive ? (
                                <>
                                  <span className="text-[15px] font-extrabold text-emerald-700">Your access: Trial active</span>
                                  {customerOwnedPrice !== null && (
                                    <p className="text-[10px] text-gray-500">Then {formatMoney(customerOwnedPrice)}</p>
                                  )}
                                </>
                              ) : customerOwnedAccessKind === 'free' || customerOwnedPrice === 0 ? (
                                <span className="text-[15px] font-extrabold text-emerald-700">Your access: Free claim</span>
                              ) : (
                                <span className="text-[15px] font-extrabold text-emerald-700">
                                  Bought at {formatMoney(customerOwnedPrice || 0)}
                                </span>
                              )}
                              <p className="text-[10px] text-gray-500">
                                {liveSellingText}
                              </p>
                              {!isFreeDigital && !isTrialDigital && discounted && (
                                <p className="text-[10px] text-gray-400 line-through">
                                  Was {formatMoney(discountPreview.basePrice)}
                                </p>
                              )}
                              {!isFreeDigital && !isTrialDigital && discounted && (
                                <p className="line-clamp-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7a00]">
                                  {[discountPreview.label, discountPreview.offerText, discountPreview.limitText].filter(Boolean).join(' - ')}
                                </p>
                              )}
                            </div>
                          ) : isFreeDigital ? (
                            <span className="text-[17px] font-extrabold text-emerald-600">Free</span>
                          ) : isTrialDigital ? (
                            <div className="space-y-0.5">
                              <span className="text-[15px] font-extrabold text-black">{product.freeTrialDays || 7}-day free trial</span>
                              <p className="text-[10px] text-gray-500">Then {formatMoney(finalPrice)}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[17px] font-extrabold text-black">
                                  {discounted ? `Now ${formatMoney(finalPrice)}` : formatMoney(finalPrice)}
                                </span>
                                {discounted && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    Was {formatMoney(discountPreview.basePrice)}
                                  </span>
                                )}
                              </div>
                              {discounted && (
                                <p className="line-clamp-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7a00]">
                                  {[discountPreview.label, discountPreview.offerText, discountPreview.limitText].filter(Boolean).join(' - ')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-colors ${
                          customerHasAccess
                            ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                            : 'bg-black text-white group-hover:bg-[#1f1f1f]'
                        }`}>
                          View Details
                          <ArrowRight size={14} />
                        </span>
                      </div>

                      {customerHasAccess && (
                        <p className="mt-1.5 text-[10px] font-bold text-emerald-700">
                          Open this product to review details, then continue in your library.
                        </p>
                      )}
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

      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSuccess={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
