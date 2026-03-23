import { useState } from 'react';
import { Phone, Package, Truck, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Calendar, Users } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCustomer } from '../context/CustomerContext';

const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  new:                { label: 'Order Received',    color: 'bg-blue-100 text-blue-700',     icon: <Clock size={13} /> },
  processing:         { label: 'Processing',         color: 'bg-yellow-100 text-yellow-700', icon: <Package size={13} /> },
  'delivery-ongoing': { label: 'Out for Delivery',   color: 'bg-orange-100 text-orange-700', icon: <Truck size={13} /> },
  delivered:          { label: 'Delivered',           color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={13} /> },
  cancelled:          { label: 'Cancelled',           color: 'bg-red-100 text-red-700',      icon: <XCircle size={13} /> },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${c.color}`}>{c.icon} {c.label}</span>;
};

const OrderCard = ({ order }) => {
  const [open, setOpen] = useState(false);
  const isPast = ['delivered','cancelled'].includes(order.status);
  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden ${isPast ? 'border-gray-100 opacity-80' : 'border-gray-200'}`}>
      <div className="p-4 flex justify-between items-start cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div>
          <p className="font-extrabold text-[#FDC700] text-sm">{order.orderId}</p>
          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
          <div className="mt-1.5"><StatusBadge status={order.status} /></div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="font-extrabold">GHS {order.total?.toLocaleString()}</p>
          <span className="text-xs text-gray-400 capitalize">{order.fulfillment}</span>
          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-0.5">
              <span className="text-gray-600">{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.qty}</span>
              <span className="font-bold">GHS {(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-1 space-y-0.5 text-xs text-gray-500">
            <div className="flex justify-between"><span>Delivery ({order.deliveryZone})</span><span>GHS {order.deliveryFee}</span></div>
            <div className="flex justify-between font-extrabold text-sm text-black pt-1"><span>Total</span><span>GHS {order.total?.toLocaleString()}</span></div>
          </div>
          {order.customer?.address && order.customer.address !== 'PICKUP' && (
            <p className="text-xs text-gray-400 mt-1.5">📍 {order.customer.address}</p>
          )}
          {order.deliveredAt && (
            <p className="text-xs text-green-600 font-bold mt-1">✅ Delivered {new Date(order.deliveredAt).toLocaleDateString('en-GB')}</p>
          )}
        </div>
      )}
    </div>
  );
};

const BookingCard = ({ booking }) => (
  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
    <div className="flex justify-between items-start">
      <div>
        <p className="font-extrabold text-[#FDC700] text-sm">{booking.bookingId}</p>
        <p className="text-xs text-gray-400">{new Date(booking.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
        <p className="font-bold text-sm mt-1">{booking.trainingTitle || booking.consultationTitle}</p>
        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${booking.type === 'training' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {booking.type === 'training' ? '🎓 Training' : '💬 Consultation'}
        </span>
      </div>
      <div className="text-right">
        <p className="font-extrabold">GHS {booking.amount?.toLocaleString()}</p>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Paid ✅</span>
      </div>
    </div>
    {booking.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">{booking.notes}</p>}
  </div>
);

const Paginator = ({ total, page, setPage, pageSize }) => {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Prev</button>
      <span className="text-xs text-gray-500 font-bold">{page} / {pages}</span>
      <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next</button>
    </div>
  );
};

export default function OrderHistory() {
  const { customer } = useCustomer();
  const [phone,    setPhone]    = useState(customer?.phone || '');
  const [orders,   setOrders]   = useState(null);
  const [bookings, setBookings] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  // Pagination
  const [orderPage,   setOrderPage]   = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [orderFilter, setOrderFilter] = useState('all');

  const lookup = async () => {
    if (!phone.trim()) return setError('Please enter your phone number');
    setError(''); setLoading(true);
    try {
      const [oRes, bRes] = await Promise.all([
        api.get(`/api/orders/customer/${phone.trim()}`),
        api.get(`/api/training/bookings/customer/${phone.trim()}`),
      ]);
      setOrders(oRes.data);
      setBookings(bRes.data);
      setOrderPage(1); setBookingPage(1);
    } catch { setError('Could not load. Please try again.'); }
    setLoading(false);
  };

  const filteredOrders = orders?.filter(o => orderFilter === 'all' || o.status === orderFilter) || [];
  const pagedOrders   = filteredOrders.slice((orderPage-1)*PAGE_SIZE, orderPage*PAGE_SIZE);
  const pagedBookings = (bookings || []).slice((bookingPage-1)*PAGE_SIZE, bookingPage*PAGE_SIZE);

  const hasData = orders !== null;

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="bg-black text-white py-14 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Track Everything</p>
        <h1 className="text-3xl md:text-4xl font-extrabold">My Orders & Bookings</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Phone lookup */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
          <p className="text-sm font-bold mb-3">Enter your phone number</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={phone} onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookup()}
                placeholder="e.g. 0241234567"
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
            </div>
            <button onClick={lookup} disabled={loading}
              className="px-5 py-3 bg-black text-white font-extrabold text-sm rounded-xl hover:bg-gray-900 disabled:opacity-50">
              {loading ? '...' : 'View'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        {hasData && (
          <>
            {orders.length === 0 && bookings?.length === 0 && (
              <div className="text-center py-12">
                <Package size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-bold">No orders or bookings found</p>
              </div>
            )}

            {(orders.length > 0 || bookings?.length > 0) && (
              <>
                {/* Tab switcher */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                  <button onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-500'}`}>
                    <Package size={15} /> Shop Orders {orders.length > 0 && <span className="bg-[#FDC700] text-black text-xs font-extrabold px-1.5 py-0.5 rounded-full">{orders.length}</span>}
                  </button>
                  <button onClick={() => setActiveTab('bookings')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'bookings' ? 'bg-black text-white' : 'text-gray-500'}`}>
                    <Calendar size={15} /> Bookings {bookings?.length > 0 && <span className="bg-[#FDC700] text-black text-xs font-extrabold px-1.5 py-0.5 rounded-full">{bookings.length}</span>}
                  </button>
                </div>

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                  <div>
                    {/* Status filter */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {['all','new','processing','delivery-ongoing','delivered','cancelled'].map(s => (
                        <button key={s} onClick={() => { setOrderFilter(s); setOrderPage(1); }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all capitalize ${orderFilter === s ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black'}`}>
                          {s === 'all' ? 'All' : s.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                    {filteredOrders.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No orders with this status</p>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3">
                          {pagedOrders.map(o => <OrderCard key={o._id} order={o} />)}
                        </div>
                        <Paginator total={filteredOrders.length} page={orderPage} setPage={setOrderPage} pageSize={PAGE_SIZE} />
                      </>
                    )}
                  </div>
                )}

                {/* BOOKINGS TAB */}
                {activeTab === 'bookings' && (
                  <div>
                    {/* Type filter */}
                    <div className="flex gap-2 mb-4">
                      {['all','training','consultation'].map(t => (
                        <button key={t} onClick={() => setBookingPage(1)}
                          className="px-3 py-1.5 text-xs font-bold rounded-full border-2 border-gray-200 hover:border-black capitalize transition-all">
                          {t}
                        </button>
                      ))}
                    </div>
                    {bookings?.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No bookings found</p>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3">
                          {pagedBookings.map(b => <BookingCard key={b._id} booking={b} />)}
                        </div>
                        <Paginator total={bookings?.length || 0} page={bookingPage} setPage={setBookingPage} pageSize={PAGE_SIZE} />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}