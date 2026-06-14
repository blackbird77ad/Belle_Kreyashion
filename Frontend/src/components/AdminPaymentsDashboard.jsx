import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../hooks/useApi';

export default function AdminPaymentsDashboard({ orders = [], providerStatus = {}, auth, onRefresh }) {
  const confirmPayment = async (order) => {
    const note = prompt('Optional reconciliation note', 'Bank transfer verified');
    if (note === null) return;
    await api.post(`/api/orders/${order._id}/payment/confirm`, { note }, auth);
    onRefresh();
  };
  const rejectPayment = async (order) => {
    const note = prompt('Reason for rejecting this payment');
    if (!note) return;
    await api.post(`/api/orders/${order._id}/payment/reject`, { note }, auth);
    onRefresh();
  };
  const retry = async (order) => { await api.post(`/api/orders/${order._id}/payment/retry`, {}, auth); onRefresh(); };
  const totals = orders.reduce((summary, order) => {
    summary[order.paymentStatus] = (summary[order.paymentStatus] || 0) + 1;
    if (order.paymentStatus === 'paid') summary.revenue += Number(order.total) || 0;
    return summary;
  }, { revenue: 0 });

  return <div className="space-y-5">
    <div className={`rounded-[24px] border p-4 ${providerStatus.connected ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start gap-3">
        {providerStatus.connected ? <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-600" /> : <XCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />}
        <div>
          <p className={`font-extrabold ${providerStatus.connected ? 'text-green-900' : 'text-amber-900'}`}>Paystack connection {providerStatus.connected ? 'verified' : 'needs attention'}</p>
          <p className={`mt-1 text-sm ${providerStatus.connected ? 'text-green-700' : 'text-amber-700'}`}>{providerStatus.message || 'Checking payment provider credentials...'}</p>
        </div>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-black p-4 text-white"><p className="text-xs font-bold uppercase text-gray-400">Paid revenue</p><p className="mt-2 text-2xl font-extrabold">GHS {totals.revenue.toLocaleString()}</p></div>{['paid','awaiting-verification','pending'].map((status) => <div key={status} className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-bold uppercase text-gray-400">{status.replace('-', ' ')}</p><p className="mt-2 text-2xl font-extrabold">{totals[status] || 0}</p></div>)}</div>
    <div className="space-y-3">{orders.map((order) => <div key={order._id} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-[#9a7a00]">{order.orderId}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.paymentStatus}</span><span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">{order.paymentMethod}</span></div><p className="mt-2 text-sm font-bold">{order.customer?.name} · {order.customer?.phone}</p><p className="mt-1 text-xs text-gray-400">{order.paymentRef} · {new Date(order.createdAt).toLocaleString()}</p><p className="mt-2 text-sm font-extrabold">GHS {Number(order.expectedPaymentAmount || order.total || 0).toLocaleString()}</p>{order.finalizationError && <p className="mt-2 max-w-2xl text-xs font-bold text-red-500">{order.finalizationError}</p>}</div><div className="flex flex-wrap gap-2">{order.paymentMethod === 'bank_transfer' && order.paymentStatus !== 'paid' && <><button onClick={() => confirmPayment(order)} className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle size={14} /> Confirm</button><button onClick={() => rejectPayment(order)} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"><XCircle size={14} /> Reject</button></>}{order.paymentStatus === 'paid' && order.finalizationState === 'failed' && <button onClick={() => retry(order)} className="inline-flex items-center gap-1 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white"><RefreshCw size={14} /> Retry fulfillment</button>}</div></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500"><span>Channel: {order.paymentChannel || 'Not reported'}</span><span>Finalization: {order.finalizationState}</span><span>Inventory: {order.inventoryCommitted ? 'Committed' : 'Waiting'}</span><span>Digital access: {order.digitalAccessGranted ? 'Granted' : 'N/A or waiting'}</span></div></div>)}{!orders.length && <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">No payment records yet.</div>}</div>
  </div>;
}
