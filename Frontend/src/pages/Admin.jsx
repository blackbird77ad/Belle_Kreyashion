import { useState, useEffect, useCallback } from 'react';
import { api } from '../hooks/useApi';
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Search, AlertCircle, X, CheckCircle, Circle, FileText, Play } from 'lucide-react';
import { CATEGORIES, CATEGORY_VALUES } from '../data/categories';

const TABS = ['Products','Training','Delivery','Orders','Bookings','Abandoned','Consultations','Blog','Featured'];

const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all';
const convertDrive = (url) => {
  if (!url) return url;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
};

const EMPTY_PROD = { name:'',desc:'',category:'',images:[''],retailPrice:'',wholesalePrice:'',wholesaleMinQty:'',stock:'',isPreOrder:false,preOrderType:'',depositPercent:'',available:true,featured:false,fastSelling:false,hasDiscount:false,discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''} };
const EMPTY_TRAIN = { title:'',desc:'',date:'',venue:'',price:'',capacity:'',image:'' };
const EMPTY_ZONE  = { name:'', fee:'' };
const EMPTY_CONSULT = { title:'',desc:'',price:'',duration:'',validity:'',isFree:false };
const EMPTY_BLOG = { title:'',excerpt:'',content:'',coverImage:'',videoUrl:'',mediaType:'image',tags:'',published:false };
const EMPTY_FEATURED = { brandName:'',productName:'',desc:'',image:'',contactInfo:'',plan:1 };

const PLANS = [1,3,6,9,12];

export default function Admin() {
  const [token,   setToken]   = useState(() => localStorage.getItem('bk_admin') || '');
  const [setup,   setSetup]   = useState(null);
  const [pin,     setPin]     = useState('');
  const [newPin,  setNewPin]  = useState('');
  const [mPin,    setMPin]    = useState('');
  const [reset,   setReset]   = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [tab,     setTab]     = useState('Products');
  const [search,  setSearch]  = useState('');
  const [customCat, setCustomCat] = useState('');

  // Per-tab data
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 20;

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({});

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    api.get('/api/auth/status').then(r => setSetup(r.data.setup)).catch(() => {});
  }, []);

  const login = async () => {
    setAuthErr('');
    try {
      const { data } = await api.post(setup ? '/api/auth/login' : '/api/auth/setup', { pin });
      localStorage.setItem('bk_admin', data.token);
      setToken(data.token); setSetup(true);
    } catch (e) { setAuthErr(e.response?.data?.message || 'Failed'); }
  };

  const resetPin = async () => {
    setAuthErr('');
    try {
      const { data } = await api.post('/api/auth/reset', { masterPin: mPin, newPin });
      localStorage.setItem('bk_admin', data.token);
      setToken(data.token); setReset(false);
    } catch (e) { setAuthErr(e.response?.data?.message || 'Failed'); }
  };

  const logout = () => { localStorage.removeItem('bk_admin'); setToken(''); };

  const ENDPOINTS = {
    Products: '/api/products', Training: '/api/training',
    Delivery: '/api/delivery', Orders: '/api/orders',
    Abandoned: '/api/orders/abandoned', Consultations: '/api/consultation',
    Blog: '/api/blog', Featured: '/api/featured', Bookings: '/api/training/bookings',
  };

  const load = useCallback(async (t, s) => {
    if (!token) return;
    setLoading(true);
    const ep = ENDPOINTS[t];
    const q  = s ? `?search=${encodeURIComponent(s)}` : '';
    try {
      const r = await api.get(ep + q, auth);
      setData(r.data);
    } catch { setData([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(tab, ''); setSearch(''); setShowForm(false); setEditId(null); setPage(1); }, [tab]);

  const getEmptyForm = (t) => {
    const map = { Products: EMPTY_PROD, Training: EMPTY_TRAIN, Delivery: EMPTY_ZONE, Consultations: EMPTY_CONSULT, Blog: EMPTY_BLOG, Featured: EMPTY_FEATURED };
    return { ...map[t] } || {};
  };

  const openNew = () => { setForm(getEmptyForm(tab)); setEditId(null); setShowForm(true); window.scrollTo({top:0,behavior:'smooth'}); };

  const openEdit = (item) => {
    if (tab === 'Products') {
      setForm({
        ...item,
        images: item.images?.length ? item.images : [''],
        wholesalePrice: item.wholesalePrice || '',
        wholesaleMinQty: item.wholesaleMinQty || '',
        depositPercent: item.depositPercent || '',
        stock: item.stock !== null && item.stock !== undefined ? item.stock : '',
        preOrderType: item.preOrderType || '',
        hasDiscount: !!item.discount,
        discount: item.discount || { type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:'' },
        variants: item.variants?.length ? JSON.stringify(item.variants) : '',
      });
    } else if (tab === 'Blog') {
      setForm({ ...item, tags: item.tags?.join(', ') || '' });
    } else {
      setForm({ ...item });
    }
    setEditId(item._id); setShowForm(true);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const buildProductBody = (f) => {
    const b = { ...f };
    b.images = [convertDrive(f.images?.[0] || '')].filter(Boolean);
    b.retailPrice = Number(f.retailPrice) || 0;
    b.wholesalePrice = f.wholesalePrice ? Number(f.wholesalePrice) : null;
    b.wholesaleMinQty = f.wholesaleMinQty ? Number(f.wholesaleMinQty) : null;
    b.stock = f.stock !== '' && f.stock !== undefined ? Number(f.stock) : null;
    b.depositPercent = f.depositPercent ? Number(f.depositPercent) : null;
    b.preOrderType = f.isPreOrder ? (f.preOrderType || null) : null;
    if (!f.isPreOrder) { b.preOrderType = null; b.depositPercent = null; }
    try { b.variants = f.variants ? JSON.parse(f.variants) : []; } catch { b.variants = []; }
    if (f.hasDiscount) {
      b.discount = { ...f.discount, value: Number(f.discount.value) || 0, limitCustomers: f.discount.limitCustomers ? Number(f.discount.limitCustomers) : null, startDate: f.discount.startDate || null, endDate: f.discount.endDate || null, active: true };
    } else { b.discount = null; }
    delete b.hasDiscount;
    return b;
  };

  const buildBlogBody = (f) => ({ ...f, tags: f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : [], coverImage: convertDrive(f.coverImage) });

  const buildTrainingBody = (f) => ({ ...f, price: Number(f.price), capacity: f.capacity ? Number(f.capacity) : null, image: convertDrive(f.image) });

  const buildFeaturedBody = (f) => ({ ...f, plan: Number(f.plan), image: convertDrive(f.image) });

  const save = async () => {
    const ep = ENDPOINTS[tab];
    let body = { ...form };
    if (tab === 'Products')     body = buildProductBody(form);
    if (tab === 'Blog')         body = buildBlogBody(form);
    if (tab === 'Training')     body = buildTrainingBody(form);
    if (tab === 'Featured')     body = buildFeaturedBody(form);
    if (tab === 'Delivery')     body = { name: form.name, fee: Number(form.fee) };
    if (tab === 'Consultations') body = { ...form, price: Number(form.price) || 0 };
    try {
      if (editId) await api.put(`${ep}/${editId}`, body, auth);
      else await api.post(ep, body, auth);
      load(tab, search); closeForm();
    } catch (e) { alert(e.response?.data?.message || 'Error saving. Check all required fields.'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    await api.delete(`${ENDPOINTS[tab]}/${id}`, auth);
    setData(d => d.filter(x => x._id !== id));
  };

  const toggle = async (id, ep) => {
    const endpoint = ep || ENDPOINTS[tab];
    const { data: updated } = await api.patch(`${endpoint}/${id}/toggle`, {}, auth);
    setData(d => d.map(x => x._id === id ? updated : x));
  };

  const sf = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const sfd = (key, val) => setForm(f => ({ ...f, discount: { ...f.discount, [key]: val } }));

  const allCats = [...new Set([...CATEGORY_VALUES.filter(v => v !== 'All'), customCat].filter(Boolean))];

  // Login screen
  if (!token) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-extrabold text-xl">BELLE <span className="text-[#FDC700]">KREYASHON</span></div>
          <p className="text-gray-400 text-sm mt-1">Admin Dashboard</p>
        </div>
        {!reset ? (
          <>
            <p className="text-sm font-bold text-center mb-2">{setup === false ? 'Create your PIN' : 'Enter your PIN'}</p>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
              placeholder={setup === false ? 'Create PIN (min 4 digits)' : 'Enter PIN'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-xl tracking-widest outline-none focus:border-black mb-3" />
            {authErr && <p className="text-red-500 text-xs text-center mb-2">{authErr}</p>}
            <button onClick={login} className="w-full py-3 bg-black text-white font-extrabold rounded-xl hover:bg-gray-900 mb-2">{setup === false ? 'Create PIN' : 'Login'}</button>
            <button onClick={() => { setReset(true); setAuthErr(''); }} className="w-full text-xs text-gray-400 hover:text-black">Forgot PIN?</button>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-center mb-3">Reset PIN</p>
            <input type="password" value={mPin} onChange={e => setMPin(e.target.value)} placeholder="Master reset PIN" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest outline-none mb-2" />
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New PIN" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest outline-none mb-3" />
            {authErr && <p className="text-red-500 text-xs text-center mb-2">{authErr}</p>}
            <button onClick={resetPin} className="w-full py-3 bg-black text-white font-extrabold rounded-xl mb-2">Reset</button>
            <button onClick={() => { setReset(false); setAuthErr(''); }} className="w-full text-xs text-gray-400 hover:text-black">Back</button>
          </>
        )}
      </div>
    </div>
  );

  const pagedData   = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages  = Math.ceil(data.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-black text-white px-4 py-3.5 flex justify-between items-center sticky top-0 z-20">
        <div className="font-extrabold">BELLE <span className="text-[#FDC700]">KREYASHON</span> <span className="text-gray-500 font-normal text-xs ml-1">Admin</span></div>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"><LogOut size={14} /> Logout</button>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto sticky top-12 z-10">
        <div className="flex">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${tab === t ? 'border-[#FDC700] text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Search + Add */}
        <div className="flex gap-2 mb-5">
          {!['Abandoned','Delivery'].includes(tab) && (
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(tab, search)}
                placeholder={`Search ${tab.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
            </div>
          )}
          {['Abandoned','Delivery'].includes(tab) && <div className="flex-1" />}
          {!['Orders','Abandoned','Bookings'].includes(tab) && (
            <button onClick={openNew} className="flex items-center gap-1 px-4 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 shrink-0">
              <Plus size={15} /> Add
            </button>
          )}
          {['Orders','Abandoned'].includes(tab) && search && (
            <button onClick={() => { setSearch(''); load(tab,''); }} className="px-3 py-2.5 bg-gray-100 text-sm font-bold rounded-xl hover:bg-gray-200">
              <X size={14} />
            </button>
          )}
          {!['Abandoned','Delivery'].includes(tab) && (
            <button onClick={() => load(tab, search)} className="px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-900 shrink-0">
              Search
            </button>
          )}
        </div>

        {/* FORM PANEL */}
        {showForm && !['Orders','Abandoned'].includes(tab) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold">{editId ? `Edit ${tab.slice(0,-1)}` : `New ${tab.slice(0,-1)}`}</h3>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-black" /></button>
            </div>

            {/* PRODUCTS form */}
            {tab === 'Products' && (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Product name *" className={inp} />
                  <div className="flex gap-2">
                    <select value={form.category||''} onChange={e => sf('category',e.target.value)} className={inp+' flex-1'}>
                      <option value="">Category *</option>
                      {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Or type a new category..." className={inp+' flex-1'} />
                    {customCat && <button onClick={() => { sf('category',customCat); }} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">Use</button>}
                  </div>
                  <input value={form.retailPrice||''} onChange={e => sf('retailPrice',e.target.value)} placeholder="Retail price (GHS) *" type="number" className={inp} />
                  <input value={form.wholesalePrice||''} onChange={e => sf('wholesalePrice',e.target.value)} placeholder="Wholesale price (optional)" type="number" className={inp} />
                  <input value={form.wholesaleMinQty||''} onChange={e => sf('wholesaleMinQty',e.target.value)} placeholder="Min wholesale qty" type="number" className={inp} />
                  <input value={form.stock||''} onChange={e => sf('stock',e.target.value)} placeholder="Stock qty (blank = unlimited)" type="number" className={inp} />
                  <input value={form.images?.[0]||''} onChange={e => sf('images',[e.target.value])} placeholder="Image URL or Google Drive link" className={inp} />
                  {form.images?.[0] && (
                    <div className="aspect-square w-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <img src={form.images[0]} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
                    </div>
                  )}
                  <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={2} className={inp+' resize-none sm:col-span-2'} />
                </div>

                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-xl">
                  {[['available','Available'],['featured','Featured'],['fastSelling','Fast Selling'],['isPreOrder','Pre-Order'],['hasDiscount','Discount']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => sf(k,e.target.checked)} className="w-4 h-4 accent-black" /> {l}
                    </label>
                  ))}
                </div>

                {form.isPreOrder && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="sm:col-span-2 text-xs font-bold text-yellow-800">Pre-Order</p>
                    <select value={form.preOrderType||''} onChange={e => sf('preOrderType',e.target.value)} className={inp}>
                      <option value="">Payment type *</option>
                      <option value="deposit">Deposit only</option>
                      <option value="full">Full payment</option>
                    </select>
                    {form.preOrderType === 'deposit' && <input value={form.depositPercent||''} onChange={e => sf('depositPercent',e.target.value)} placeholder="Deposit %" type="number" className={inp} />}
                  </div>
                )}

                {form.hasDiscount && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="sm:col-span-2 text-xs font-bold text-green-800">Discount Settings</p>
                    <select value={form.discount?.type||'percent'} onChange={e => sfd('type',e.target.value)} className={inp}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed amount (GHS)</option>
                    </select>
                    <input value={form.discount?.value||''} onChange={e => sfd('value',e.target.value)} placeholder={form.discount?.type==='percent'?'e.g. 20':'e.g. 50'} type="number" className={inp} />
                    <input value={form.discount?.label||''} onChange={e => sfd('label',e.target.value)} placeholder='Label e.g. "Flash Sale!"' className={inp} />
                    <input value={form.discount?.limitCustomers||''} onChange={e => sfd('limitCustomers',e.target.value)} placeholder="First N customers only (optional)" type="number" className={inp} />
                    <input value={form.discount?.startDate||''} onChange={e => sfd('startDate',e.target.value)} type="date" className={inp} />
                    <input value={form.discount?.endDate||''} onChange={e => sfd('endDate',e.target.value)} type="date" className={inp} />
                    <p className="sm:col-span-2 text-xs text-green-700">Auto-deactivates after end date or when customer limit is reached.</p>
                  </div>
                )}
              </div>
            )}

            {/* TRAINING form */}
            {tab === 'Training' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''} onChange={e => sf('title',e.target.value)} placeholder="Title *" className={inp} />
                <input value={form.date||''} onChange={e => sf('date',e.target.value)} placeholder="Date (e.g. 15 April 2026)" className={inp} />
                <input value={form.venue||''} onChange={e => sf('venue',e.target.value)} placeholder="Venue / Location" className={inp} />
                <input value={form.price||''} onChange={e => sf('price',e.target.value)} placeholder="Price (GHS)" type="number" className={inp} />
                <input value={form.capacity||''} onChange={e => sf('capacity',e.target.value)} placeholder="Capacity (optional)" type="number" className={inp} />
                <input value={form.image||''} onChange={e => sf('image',e.target.value)} placeholder="Image URL or Drive link" className={inp} />
                <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={2} className={inp+' resize-none sm:col-span-2'} />
              </div>
            )}

            {/* DELIVERY form */}
            {tab === 'Delivery' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Zone name (e.g. Osu / Airport Area) *" className={inp} />
                <input value={form.fee||''} onChange={e => sf('fee',e.target.value)} placeholder="Delivery fee (GHS) *" type="number" className={inp} />
              </div>
            )}

            {/* CONSULTATIONS form */}
            {tab === 'Consultations' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''} onChange={e => sf('title',e.target.value)} placeholder="Title (e.g. Hair Business Consultation) *" className={inp} />
                <input value={form.price||''} onChange={e => sf('price',e.target.value)} placeholder="Price (GHS, 0 for free)" type="number" className={inp} />
                <input value={form.duration||''} onChange={e => sf('duration',e.target.value)} placeholder="Duration (e.g. 1 hour)" className={inp} />
                <input value={form.validity||''} onChange={e => sf('validity',e.target.value)} placeholder="Validity (e.g. Valid for 7 days)" className={inp} />
                <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={3} className={inp+' resize-none sm:col-span-2'} />
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.isFree} onChange={e => sf('isFree',e.target.checked)} className="w-4 h-4 accent-black" /> Mark as Free
                </label>
              </div>
            )}

            {/* BLOG form */}
            {tab === 'Blog' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''} onChange={e => sf('title',e.target.value)} placeholder="Post title *" className={inp+' sm:col-span-2'} />
                <div className="flex bg-gray-100 rounded-xl p-1 sm:col-span-2">
                  {['image','video','both'].map(m => (
                    <button key={m} onClick={() => sf('mediaType',m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${form.mediaType===m?'bg-black text-white':'text-gray-500'}`}>{m}</button>
                  ))}
                </div>
                {(form.mediaType === 'image' || form.mediaType === 'both') && (
                  <input value={form.coverImage||''} onChange={e => sf('coverImage',e.target.value)} placeholder="Cover image URL or Drive link" className={inp} />
                )}
                {(form.mediaType === 'video' || form.mediaType === 'both') && (
                  <input value={form.videoUrl||''} onChange={e => sf('videoUrl',e.target.value)} placeholder="Video URL (YouTube, TikTok, direct link)" className={inp} />
                )}
                <input value={form.tags||''} onChange={e => sf('tags',e.target.value)} placeholder="Tags (comma separated: hair, tips, wigs)" className={inp} />
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.published} onChange={e => sf('published',e.target.checked)} className="w-4 h-4 accent-black" /> Publish now
                </label>
                <textarea value={form.excerpt||''} onChange={e => sf('excerpt',e.target.value)} placeholder="Short excerpt (shown on blog listing)" rows={2} className={inp+' resize-none sm:col-span-2'} />
                <textarea value={form.content||''} onChange={e => sf('content',e.target.value)} placeholder="Full post content..." rows={8} className={inp+' resize-none sm:col-span-2'} />
              </div>
            )}

            {/* FEATURED form */}
            {tab === 'Featured' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.brandName||''} onChange={e => sf('brandName',e.target.value)} placeholder="Brand name *" className={inp} />
                <input value={form.productName||''} onChange={e => sf('productName',e.target.value)} placeholder="Product / service to feature *" className={inp} />
                <input value={form.contactInfo||''} onChange={e => sf('contactInfo',e.target.value)} placeholder="Brand contact (WhatsApp / email)" className={inp} />
                <input value={form.image||''} onChange={e => sf('image',e.target.value)} placeholder="Product image URL or Drive link" className={inp} />
                <input value={form.price||''} onChange={e => sf('price',e.target.value)} placeholder="Price (GHS) — leave blank to hide" type="number" className={inp} />
                <input value={form.stock||''} onChange={e => sf('stock',e.target.value)} placeholder="Stock quantity (update daily with partner)" type="number" className={inp} />
                <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Product description for featured display" rows={2} className={inp+' resize-none sm:col-span-2'} />
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold mb-1">Subscription Plan</p>
                  <p className="text-xs text-gray-400 mb-2">Duration sets the auto-expiry date. Update stock daily by editing this listing.</p>
                  <div className="flex flex-wrap gap-2">
                    {PLANS.map(p => (
                      <button key={p} onClick={() => sf('plan',p)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${Number(form.plan)===p?'bg-black text-white border-black':'border-gray-200 hover:border-black'}`}>
                        {p} month{p>1?'s':''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={save} className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900">Save</button>
              <button onClick={closeForm} className="px-5 py-2.5 bg-gray-100 font-bold text-sm rounded-xl hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        {/* Orders status filter */}
        {tab === 'Orders' && !loading && (
          <div className="flex gap-2 flex-wrap mb-4">
            {['all','new','processing','delivery-ongoing','delivered','cancelled'].map(s => (
              <button key={s} onClick={() => {
                const ep = s === 'all' ? '/api/orders' : `/api/orders?status=${s}`;
                api.get(ep, auth).then(r => setData(r.data)).catch(() => {});
              }} className="px-3 py-1.5 text-xs font-bold rounded-full border-2 border-gray-200 hover:border-black capitalize transition-all">
                {s === 'all' ? 'All' : s.replace('-',' ')}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>}

        {/* DATA GRID */}
        {!loading && (
          <>
          <div className={tab === 'Products' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3' : tab === 'Blog' ? 'grid sm:grid-cols-2 gap-3' : 'flex flex-col gap-3'}>

            {/* PRODUCTS */}
            {tab === 'Products' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-3 border border-gray-100 flex gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {item.images?.[0] && <img src={item.images[0]} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                  <p className="text-sm font-bold">GHS {item.retailPrice?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Stock: {item.stock ?? '∞'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.featured    && <span className="text-xs bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-full">Featured</span>}
                    {item.fastSelling && <span className="text-xs bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded-full">Fast</span>}
                    {item.isPreOrder  && <span className="text-xs bg-blue-50 text-blue-500 font-bold px-1.5 py-0.5 rounded-full">Pre-Order</span>}
                    {item.discount?.active && <span className="text-xs bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full">Discount</span>}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* TRAINING */}
            {tab === 'Training' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-sm">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.date} — {item.venue}</p>
                  <p className="font-bold text-sm">GHS {item.price?.toLocaleString()}</p>
                </div>
                <button onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}

            {/* DELIVERY */}
            {tab === 'Delivery' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-400">GHS {item.fee?.toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* ORDERS */}
            {tab === 'Orders' && pagedData.map(item => {
              const STATUS_OPTS = ['new','processing','delivery-ongoing','delivered','cancelled'];
              const STATUS_COLORS = { new:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700', 'delivery-ongoing':'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' };
              const updateStatus = async (id, status) => {
                try {
                  const { data: updated } = await api.patch(`/api/orders/${id}/status`, { status }, auth);
                  setData(d => d.map(x => x._id === id ? updated : x));
                } catch { alert('Failed to update status'); }
              };
              return (
                <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-extrabold text-[#FDC700] text-sm">{item.orderId}</p>
                      <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                      <p className="font-bold text-sm mt-1">{item.customer?.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">📞 {item.customer?.phone}</p>
                      {item.customer?.address && item.customer.address !== 'PICKUP' && <p className="text-xs text-gray-400">📍 {item.customer.address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold">GHS {item.total?.toLocaleString()}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full capitalize">{item.fulfillment}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mb-3">
                    {item.items?.map((x,i) => <div key={i}>{x.name}{x.variant ? ` (${x.variant})` : ''} × {x.qty} — GHS {x.price}</div>)}
                    <div className="font-bold text-black mt-1">Total: GHS {item.total?.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-500">Status:</span>
                    {STATUS_OPTS.map(s => (
                      <button key={s} onClick={() => updateStatus(item._id, s)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border-2 transition-all capitalize ${item.status === s ? STATUS_COLORS[s] + ' border-transparent' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
                        {s.replace('-',' ')}
                      </button>
                    ))}
                    <a href={`https://wa.me/${item.customer?.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Hi ' + item.customer?.name + '! Your Belle Kreyashon order ' + item.orderId + ' status has been updated. Please contact us for details.')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs bg-green-500 text-white font-bold px-3 py-1 rounded-full hover:bg-green-600">
                      Notify
                    </a>
                  </div>
                </div>
              );
            })}

            {/* ABANDONED */}
            {tab === 'Abandoned' && pagedData.map(item => (
              <div key={item._id} className={`bg-white rounded-2xl p-4 border flex gap-3 ${item.followedUp?'border-green-200 opacity-70':'border-gray-100'}`}>
                <AlertCircle size={18} className={item.followedUp?'text-green-500 shrink-0 mt-0.5':'text-yellow-500 shrink-0 mt-0.5'} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.items?.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
                  <p className="text-xs text-gray-400">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(item._id, '/api/orders/abandoned')}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all ${item.followedUp?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500 hover:bg-green-50'}`}>
                    {item.followedUp ? <CheckCircle size={13}/> : <Circle size={13}/>} {item.followedUp?'Done':'Pending'}
                  </button>
                  <a href={`https://wa.me/${item.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${item.name}! We noticed you left items in your cart at Belle Kreyashon. Can we help?`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-lg text-center">WA</a>
                </div>
              </div>
            ))}

            {/* CONSULTATIONS */}
            {tab === 'Consultations' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-sm">{item.title}</p>
                  {item.duration && <p className="text-xs text-gray-400">{item.duration}</p>}
                  {item.validity && <p className="text-xs text-gray-400">{item.validity}</p>}
                  <p className="font-bold text-sm mt-0.5">{item.isFree ? 'Free' : `GHS ${item.price?.toLocaleString()}`}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.desc}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* BLOG */}
            {tab === 'Blog' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {item.coverImage && <img src={item.coverImage} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display='none';}} />}
                  {item.videoUrl && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><Play size={16} className="text-white ml-0.5" /></div></div>}
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-extrabold text-sm line-clamp-2 flex-1 mr-2">{item.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.published?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{item.published?'Live':'Draft'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => toggle(item._id)} className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-black hover:text-white transition-all">{item.published?'Unpublish':'Publish'}</button>
                    <button onClick={() => openEdit(item)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-black hover:text-white transition-all"><Pencil size={13}/></button>
                    <button onClick={() => del(item._id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}

            {/* FEATURED */}
            {tab === 'Featured' && pagedData.map(item => {
              const expired = new Date(item.subscriptionEnd) < new Date();
              return (
                <div key={item._id} className={`bg-white rounded-2xl p-4 border flex gap-3 ${expired?'border-red-200 opacity-60':'border-gray-100'}`}>
                  {item.image && <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" onError={e=>{e.target.style.display='none';}} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.brandName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.plan} month plan</p>
                    <p className="text-xs text-gray-400">Ends: {new Date(item.subscriptionEnd).toLocaleDateString()}</p>
                    {expired && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">Expired</span>}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                    <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}

            {/* BOOKINGS */}
            {tab === 'Bookings' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-extrabold text-[#FDC700] text-sm">{item.bookingId}</p>
                    <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                    <p className="font-bold text-sm mt-1">{item.customer?.name}</p>
                    <p className="text-xs text-gray-400">📞 {item.customer?.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.type === 'training' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {item.type === 'training' ? '🎓 Training' : '💬 Consultation'}
                    </span>
                    <p className="font-extrabold mt-1">GHS {item.amount?.toLocaleString()}</p>
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Paid ✅</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                  {item.trainingTitle && <p>Session: <span className="font-bold">{item.trainingTitle}</span></p>}
                  {item.consultationTitle && <p>Consultation: <span className="font-bold">{item.consultationTitle}</span></p>}
                  {item.notes && <p className="mt-1 text-gray-400">Notes: {item.notes}</p>}
                  <p className="mt-1 text-gray-400">Ref: {item.paymentRef}</p>
                </div>
                <a href={`https://wa.me/${item.customer?.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Hi ' + item.customer?.name + '! Your Belle Kreyashon booking ' + item.bookingId + ' has been confirmed. We will contact you with further details soon.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-600">
                  WhatsApp Customer
                </a>
              </div>
            ))}

            {/* Empty state */}
            {data.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No {tab.toLowerCase()} yet.</div>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Prev</button>
              <span className="text-xs text-gray-500 font-bold">{page} / {totalPages} ({data.length} total)</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next</button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}