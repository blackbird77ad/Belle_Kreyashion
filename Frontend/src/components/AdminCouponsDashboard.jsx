import { useState } from 'react';
import { CheckCircle, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { api } from '../hooks/useApi';

const emptyCoupon = {
  code: '', name: '', description: '', type: 'percent', value: '', minSubtotal: '', maxDiscount: '', usageLimit: '', perCustomerLimit: 1,
  active: true, startDate: '', endDate: '', customerSegment: 'all', campaignName: '', referralCode: '', applicableCategories: '',
};
const inputClass = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-black';

export default function AdminCouponsDashboard({ coupons = [], auth, onRefresh }) {
  const [form, setForm] = useState(emptyCoupon);
  const [editingId, setEditingId] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { setOpen(false); setEditingId(''); setForm(emptyCoupon); setError(''); };
  const edit = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      ...emptyCoupon,
      ...coupon,
      startDate: coupon.startDate ? String(coupon.startDate).slice(0, 10) : '',
      endDate: coupon.endDate ? String(coupon.endDate).slice(0, 10) : '',
      applicableCategories: (coupon.applicableCategories || []).join(', '),
    });
    setOpen(true);
  };
  const save = async () => {
    setSaving(true); setError('');
    const payload = { ...form, applicableCategories: String(form.applicableCategories || '').split(',').map((value) => value.trim()).filter(Boolean) };
    try {
      if (editingId) await api.put(`/api/coupons/${editingId}`, payload, auth);
      else await api.post('/api/coupons', payload, auth);
      close(); onRefresh();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save coupon'); }
    finally { setSaving(false); }
  };
  const toggle = async (id) => { await api.patch(`/api/coupons/${id}/toggle`, {}, auth); onRefresh(); };
  const remove = async (id) => { if (!confirm('Delete this coupon permanently?')) return; await api.delete(`/api/coupons/${id}`, auth); onRefresh(); };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Promotions</p><h2 className="mt-1 text-2xl font-extrabold">Coupon management</h2><p className="mt-1 text-sm text-gray-500">Control campaign codes, limits, customer eligibility, dates, and redemption totals.</p></div>
      <button onClick={() => { setForm(emptyCoupon); setEditingId(''); setOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white"><Plus size={16} /> New Coupon</button>
    </div>
    {open && <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold">{editingId ? 'Edit coupon' : 'Create coupon'}</h3><button onClick={close}><X size={18} /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input className={inputClass} value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="Code, e.g. WELCOME10" />
      <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Coupon name" />
      <select className={inputClass} value={form.type} onChange={(e) => update('type', e.target.value)}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free shipping</option></select>
      <input className={inputClass} type="number" value={form.value} onChange={(e) => update('value', e.target.value)} placeholder="Value" />
      <input className={inputClass} type="number" value={form.minSubtotal} onChange={(e) => update('minSubtotal', e.target.value)} placeholder="Minimum subtotal" />
      <input className={inputClass} type="number" value={form.maxDiscount ?? ''} onChange={(e) => update('maxDiscount', e.target.value)} placeholder="Maximum discount" />
      <input className={inputClass} type="number" value={form.usageLimit ?? ''} onChange={(e) => update('usageLimit', e.target.value)} placeholder="Total usage limit" />
      <input className={inputClass} type="number" value={form.perCustomerLimit} onChange={(e) => update('perCustomerLimit', e.target.value)} placeholder="Uses per customer" />
      <select className={inputClass} value={form.customerSegment} onChange={(e) => update('customerSegment', e.target.value)}><option value="all">All customers</option><option value="new">New customers</option><option value="returning">Returning customers</option></select>
      <input className={inputClass} type="date" value={form.startDate || ''} onChange={(e) => update('startDate', e.target.value)} />
      <input className={inputClass} type="date" value={form.endDate || ''} onChange={(e) => update('endDate', e.target.value)} />
      <input className={inputClass} value={form.campaignName} onChange={(e) => update('campaignName', e.target.value)} placeholder="Campaign name" />
      <input className={inputClass} value={form.referralCode} onChange={(e) => update('referralCode', e.target.value)} placeholder="Referral / influencer code" />
      <input className={`${inputClass} sm:col-span-2`} value={form.applicableCategories} onChange={(e) => update('applicableCategories', e.target.value)} placeholder="Categories, comma separated (blank = all)" />
      <input className={`${inputClass} sm:col-span-2 lg:col-span-3`} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Internal description" />
    </div>{error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}<button onClick={save} disabled={saving} className="mt-4 rounded-2xl bg-[#FDC700] px-5 py-3 text-sm font-extrabold disabled:opacity-50">{saving ? 'Saving...' : 'Save Coupon'}</button></div>}
    <div className="grid gap-3 lg:grid-cols-2">{coupons.map((coupon) => <div key={coupon._id} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">{coupon.code}</span>{coupon.active && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={13} /> Active</span>}</div><h3 className="mt-3 font-extrabold">{coupon.name}</h3><p className="mt-1 text-xs text-gray-500">{coupon.type === 'percent' ? `${coupon.value}% off` : coupon.type === 'fixed' ? `GHS ${coupon.value} off` : 'Free shipping'} · {coupon.usedCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} uses</p><p className="mt-1 text-xs text-gray-400">Segment: {coupon.customerSegment} · Per customer: {coupon.perCustomerLimit || 1}</p></div><div className="flex gap-2"><button onClick={() => toggle(coupon._id)} title="Toggle coupon" className={coupon.active ? 'text-green-600' : 'text-gray-300'}><Power size={17} /></button><button onClick={() => edit(coupon)} title="Edit coupon"><Pencil size={17} /></button><button onClick={() => remove(coupon._id)} title="Delete coupon" className="text-red-400"><Trash2 size={17} /></button></div></div></div>)}{!coupons.length && <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400 lg:col-span-2">No coupons yet.</div>}</div>
  </div>;
}
