import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Grid2X2,
  LayoutDashboard,
  List,
  Loader2,
  LogOut,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';
import { useCustomer } from '../context/CustomerContext';
import { api } from '../hooks/useApi';
import { getProductPath } from '../utils/seoPaths';
import { generateInvoice } from '../utils/generateInvoice';

const ACTIVE_ORDER_STATUSES = ['new', 'processing', 'delivery-ongoing'];
const ORDER_STATUS_FLOW = ['new', 'processing', 'delivery-ongoing', 'delivered'];

const ORDER_STATUS_META = {
  new: { label: 'Order Received', short: 'Received', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock3 size={13} /> },
  processing: { label: 'Processing', short: 'Processing', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Package size={13} /> },
  'delivery-ongoing': { label: 'Out For Delivery', short: 'On The Way', tone: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Truck size={13} /> },
  delivered: { label: 'Delivered', short: 'Delivered', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Cancelled', short: 'Cancelled', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle size={13} /> },
};

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All Activity' },
  { key: 'orders', label: 'All Orders' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'training', label: 'Training' },
  { key: 'digital', label: 'Digital Orders' },
];

const ACTIVITY_STATUS_FILTERS = [
  { key: 'all', label: 'All Status' },
  { key: 'active', label: 'In Progress' },
  { key: 'new', label: 'Received' },
  { key: 'processing', label: 'Processing' },
  { key: 'delivery-ongoing', label: 'On The Way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVITY_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amountHigh', label: 'Highest Amount' },
  { value: 'amountLow', label: 'Lowest Amount' },
  { value: 'status', label: 'Active First' },
  { value: 'name', label: 'Name A-Z' },
];

const LIBRARY_FILTERS = [
  { key: 'all', label: 'All Access' },
  { key: 'paid', label: 'Paid' },
  { key: 'trial', label: 'Trial' },
  { key: 'free', label: 'Free' },
  { key: 'certified', label: 'Certified' },
];

const LIBRARY_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'progress', label: 'Most Progress' },
  { value: 'lastAccessed', label: 'Recently Opened' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'expiring', label: 'Expiring Soon' },
];

const STATUS_PRIORITY = {
  new: 0,
  processing: 1,
  'delivery-ongoing': 2,
  delivered: 3,
  cancelled: 4,
};

const currency = (value = 0) => `GHS ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildSupportEmailLink = (email = '', productName = '') => {
  if (!email) return '';
  const subject = encodeURIComponent(`Support needed for ${productName || 'digital training'}`);
  const body = encodeURIComponent(`Hello trainer,\n\nI need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.\n\nThank you.`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const buildSupportWhatsAppLink = (phone = '', productName = '') => {
  const cleaned = String(phone || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  const normalized = cleaned.startsWith('+')
    ? cleaned.slice(1)
    : (cleaned.startsWith('0') && cleaned.length === 10 ? `233${cleaned.slice(1)}` : cleaned);
  const text = encodeURIComponent(`Hello trainer, I need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.`);
  return `https://wa.me/${normalized}?text=${text}`;
};

const getOrderStatusMeta = (status = 'new') => ORDER_STATUS_META[status] || ORDER_STATUS_META.new;

const getActivityTypeLabel = (entry) => {
  if (entry.entityType === 'booking') {
    return entry.bookingType === 'training' ? 'Training Booking' : 'Consultation Booking';
  }
  if (entry.hasDigitalItems && !entry.hasPhysicalItems) return 'Digital Product Order';
  if (entry.hasDigitalItems && entry.hasPhysicalItems) return 'Mixed Order';
  return 'Shop Order';
};

const sumOrderQuantity = (items = []) => (
  items.reduce((total, item) => total + (Number(item.qty) || 0), 0)
);

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[95] bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
    <div
      className="mx-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">{subtitle}</p>
          <h3 className="mt-1 truncate text-xl font-extrabold text-black">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-black hover:text-black"
        >
          <X size={16} />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-5">{children}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const meta = getOrderStatusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.tone}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

const StatCard = ({ label, value, tone = 'bg-white', caption = '', onClick }) => {
  const classes = `rounded-[26px] border border-gray-100 px-4 py-4 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-black' : ''} ${tone}`;
  const content = (
    <div className={classes}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-black">{value}</p>
      {caption && <p className="mt-1 text-xs text-gray-500">{caption}</p>}
    </div>
  );

  if (!onClick) return content;
  return <button type="button" onClick={onClick} className="text-left">{content}</button>;
};

const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1">
    <button
      type="button"
      onClick={() => onChange('grid')}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all ${value === 'grid' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
    >
      <Grid2X2 size={16} />
    </button>
    <button
      type="button"
      onClick={() => onChange('list')}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all ${value === 'list' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
    >
      <List size={16} />
    </button>
  </div>
);

const DashboardPaginator = ({ total, page, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black disabled:opacity-40"
      >
        Prev
      </button>
      <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
};

const OrderProgress = ({ status = 'new' }) => {
  const activeIndex = ORDER_STATUS_FLOW.indexOf(status);
  const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div className="flex items-center gap-2">
      {ORDER_STATUS_FLOW.map((step, index) => {
        const active = index <= resolvedIndex;
        return (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-extrabold ${active ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-400'}`}>
              {index + 1}
            </div>
            {index < ORDER_STATUS_FLOW.length - 1 && (
              <div className={`h-1 flex-1 rounded-full ${index < resolvedIndex ? 'bg-black' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const ActivityCard = ({ entry, view, onOpen }) => {
  const isOrder = entry.entityType === 'order';
  const statusMeta = isOrder ? getOrderStatusMeta(entry.status) : null;

  if (view === 'list') {
    return (
      <div className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#fcf7df] px-2.5 py-1 text-[11px] font-extrabold text-[#9a7a00]">
                {getActivityTypeLabel(entry)}
              </span>
              {isOrder ? <StatusBadge status={entry.status} /> : (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold text-purple-700">
                  {entry.bookingType === 'training' ? 'Training' : 'Consultation'}
                </span>
              )}
            </div>
            <button type="button" onClick={() => onOpen(entry)} className="mt-3 text-left">
              <h3 className="text-lg font-extrabold text-black hover:text-[#9a7a00]">{entry.primaryId}</h3>
            </button>
            <p className="mt-1 text-sm font-bold text-gray-800">{entry.title}</p>
            <p className="mt-1 text-sm text-gray-500">{entry.summary}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="rounded-2xl bg-[#fcfbf7] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Amount</p>
              <p className="mt-1 text-lg font-extrabold text-black">{currency(entry.amount)}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(entry)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-all ${
                isOrder
                  ? `${statusMeta?.tone || 'bg-black text-white border-black'} border`
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black'
              }`}
            >
              View Details
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#fcf7df] px-2.5 py-1 text-[11px] font-extrabold text-[#9a7a00]">
            {getActivityTypeLabel(entry)}
          </span>
          <button type="button" onClick={() => onOpen(entry)} className="mt-3 block text-left">
            <h3 className="line-clamp-1 text-lg font-extrabold text-black hover:text-[#9a7a00]">{entry.primaryId}</h3>
          </button>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-gray-800">{entry.title}</p>
        </div>
        {isOrder ? <StatusBadge status={entry.status} /> : (
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold text-purple-700">
            {entry.bookingType === 'training' ? 'Training' : 'Booking'}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between gap-3">
          <span>{formatDate(entry.createdAt)}</span>
          <span className="font-extrabold text-black">{currency(entry.amount)}</span>
        </div>
        <p className="line-clamp-2">{entry.summary}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="text-xs text-gray-500">
          {isOrder
            ? `${entry.itemCount} item${entry.itemCount === 1 ? '' : 's'}`
            : (entry.bookingType === 'training' ? 'Training session' : 'Consultation booking')}
        </div>
        <button
          type="button"
          onClick={() => onOpen(entry)}
          className="inline-flex items-center gap-1 text-sm font-extrabold text-black hover:text-[#9a7a00]"
        >
          Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

const LibraryCard = ({ item, view, onOpen }) => {
  const progress = item.progress?.percent || 0;

  if (view === 'list') {
    return (
      <div className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[160px_1fr_auto] lg:items-center">
          <div className="overflow-hidden rounded-[22px] bg-[#fcfbf7]">
            {item.productImage ? (
              <img src={item.productImage} alt={item.productName} className="aspect-[4/3] w-full object-contain p-4" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-gray-300">
                <BookOpen size={30} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-extrabold text-[#FDC700]">
                {item.digitalAccessKind === 'free' ? 'Free Access' : item.digitalAccessKind === 'trial' ? 'Trial Access' : 'Paid Access'}
              </span>
              {item.isCertified && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
                  Certified
                </span>
              )}
            </div>
            <button type="button" onClick={() => onOpen(item)} className="mt-3 text-left">
              <h3 className="line-clamp-1 text-lg font-extrabold text-black hover:text-[#9a7a00]">{item.productName}</h3>
            </button>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.productDesc || item.seriesDescription || 'Protected digital access inside your Belle Kreyashon learning space.'}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-extrabold text-gray-700 hover:border-black hover:text-black"
            >
              View Details
            </button>
            <Link
              to={`/digital-library?product=${item.productId}`}
              className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative bg-[#fcfbf7]">
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} className="aspect-[4/3] w-full object-contain p-5" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-gray-300">
            <BookOpen size={34} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-extrabold text-[#FDC700]">
            {item.digitalAccessKind === 'free' ? 'Free' : item.digitalAccessKind === 'trial' ? 'Trial' : 'Paid'}
          </span>
          {item.isCertified && (
            <span className="rounded-full border border-amber-200 bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
              Certified
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <button type="button" onClick={() => onOpen(item)} className="text-left">
          <h3 className="line-clamp-2 text-lg font-extrabold text-black hover:text-[#9a7a00]">{item.productName}</h3>
        </button>
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{item.productDesc || item.seriesDescription || 'Protected digital access inside your Belle Kreyashon learning space.'}</p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <span className="text-xs text-gray-500">{item.files?.length || 0} file{item.files?.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={() => onOpen(item)} className="inline-flex items-center gap-1 text-sm font-extrabold text-black hover:text-[#9a7a00]">
            Details
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ActivityDetailModal = ({ entry, signedIn, onClose }) => {
  if (!entry) return null;

  if (entry.entityType === 'booking') {
    const booking = entry.raw;

    return (
      <ModalShell
        title={entry.title}
        subtitle={`${entry.primaryId} • ${entry.bookingType === 'training' ? 'Training Booking' : 'Consultation Booking'}`}
        onClose={onClose}
      >
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-[26px] border border-gray-100 bg-[#fcfbf7] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Booking Notes</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{booking.notes || 'No additional notes were added to this booking yet.'}</p>
            </div>

            <div className="rounded-[26px] border border-gray-100 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">What This Covers</p>
              <div className="mt-3 rounded-2xl border border-gray-100 bg-[#fcfbf7] px-4 py-3">
                <p className="text-sm font-extrabold text-black">{entry.title}</p>
                <p className="mt-1 text-xs text-gray-500">{entry.bookingType === 'training' ? 'Training session booking' : 'Consultation booking'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[26px] border border-gray-100 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Summary</p>
              <div className="mt-3 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Amount</span>
                  <span className="font-extrabold text-black">{currency(booking.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Created</span>
                  <span className="font-bold text-black">{formatDateTime(booking.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Payment</span>
                  <span className="font-bold text-emerald-700">{booking.paymentStatus || 'paid'}</span>
                </div>
                {booking.paymentRef && (
                  <div className="flex items-center justify-between gap-3">
                    <span>Reference</span>
                    <span className="font-bold text-black">{booking.paymentRef}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => generateInvoice(booking)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
            >
              <Download size={15} />
              Download Invoice
            </button>

            {signedIn && (
              <Link
                to="/digital-library"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
              >
                Open Digital Library
              </Link>
            )}
          </div>
        </div>
      </ModalShell>
    );
  }

  const order = entry.raw;

  return (
    <ModalShell title={entry.title} subtitle={`${entry.primaryId} • ${getActivityTypeLabel(entry)}`} onClose={onClose}>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={order.status} />
              <span className="rounded-full bg-[#fcf7df] px-2.5 py-1 text-[11px] font-extrabold text-[#9a7a00]">
                {order.fulfillment === 'digital' ? 'Digital Delivery' : order.fulfillment}
              </span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Delivery Progress</p>
            <div className="mt-4">
              <OrderProgress status={order.status} />
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Items In This Order</p>
              <p className="text-xs font-bold text-gray-500">{sumOrderQuantity(order.items)} item{sumOrderQuantity(order.items) === 1 ? '' : 's'}</p>
            </div>
            <div className="mt-4 space-y-3">
              {(order.items || []).map((item, index) => (
                <div key={`${item.productId || item.slug || item.name}-${index}`} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-extrabold text-black">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.variant ? `${item.variant} • ` : ''}
                        Qty {item.qty} • {item.isDigital ? (item.digitalAccessKind === 'trial' ? `${item.trialDays || 7}-day trial` : 'Digital access') : (item.category || 'Shop item')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-extrabold text-black">{currency((Number(item.price) || 0) * (Number(item.qty) || 0))}</p>
                      <p className="text-xs text-gray-500">at {currency(item.price)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.slug || item.productId) && (
                      <Link
                        to={getProductPath({ slug: item.slug, _id: item.productId })}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                      >
                        View Product
                      </Link>
                    )}
                    {signedIn && item.isDigital && item.productId && (
                      <Link
                        to={`/digital-library?product=${item.productId}`}
                        className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2 text-xs font-extrabold text-white hover:bg-gray-900"
                      >
                        Open In Library
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Summary</p>
            <div className="mt-3 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-3">
                <span>Created</span>
                <span className="font-bold text-black">{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span className="font-bold text-black">{currency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Delivery</span>
                <span className="font-bold text-black">{currency(order.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Total</span>
                <span className="text-lg font-extrabold text-black">{currency(order.total)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Payment</span>
                <span className="font-bold text-emerald-700">{order.paymentStatus}</span>
              </div>
              {order.deliveryZone && (
                <div className="flex items-center justify-between gap-3">
                  <span>Zone</span>
                  <span className="font-bold text-black">{order.deliveryZone}</span>
                </div>
              )}
              {order.paymentRef && (
                <div className="flex items-center justify-between gap-3">
                  <span>Reference</span>
                  <span className="font-bold text-black">{order.paymentRef}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-100 bg-[#fcfbf7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Delivery Address</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {order.customer?.address && order.customer.address !== 'DIGITAL ACCESS'
                ? order.customer.address
                : order.fulfillment === 'digital'
                  ? 'This order unlocks inside your secure digital library.'
                  : order.fulfillment === 'pickup'
                    ? 'Pickup was selected for this order.'
                    : 'No address was saved for this order.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => generateInvoice(order)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
          >
            <Download size={15} />
            Download Invoice
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const LibraryDetailModal = ({ item, onClose }) => {
  if (!item) return null;

  const supportEmailLink = buildSupportEmailLink(item.supportEmail || '', item.productName || '');
  const supportWhatsAppLink = buildSupportWhatsAppLink(item.supportWhatsApp || '', item.productName || '');

  return (
    <ModalShell title={item.productName} subtitle="Digital Library Details" onClose={onClose}>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-[#fcfbf7]">
            {item.productImage ? (
              <img src={item.productImage} alt={item.productName} className="aspect-[4/3] w-full object-contain p-6" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-gray-300">
                <BookOpen size={42} />
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-extrabold text-[#FDC700]">
                {item.digitalAccessKind === 'free' ? 'Free Access' : item.digitalAccessKind === 'trial' ? 'Trial Access' : 'Paid Access'}
              </span>
              {item.isCertified && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
                  Certified
                </span>
              )}
              {item.accessType && (
                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-extrabold text-gray-600">
                  {item.accessType === 'lifetime' ? 'Lifetime Access' : `${item.accessMonths || 6} Month Access`}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {item.productDesc || item.seriesDescription || 'Protected learning access is ready inside your secure Belle Kreyashon library workspace.'}
            </p>
          </div>

          {(item.files || []).length > 0 && (
            <div className="rounded-[26px] border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Module Preview</p>
                <p className="text-xs font-bold text-gray-500">{item.files.length} file{item.files.length === 1 ? '' : 's'}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {item.files.slice(0, 6).map((file) => (
                  <div key={file.assetId} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                    <p className="text-sm font-extrabold text-black">{file.label || file.originalFilename}</p>
                    <p className="mt-1 text-xs text-gray-500">{file.stepTitle || file.stepSummary || file.fileKind}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Learning Progress</p>
            <div className="mt-3 flex items-center justify-between text-sm font-bold text-gray-600">
              <span>{item.progress?.completedModules || 0} of {item.progress?.totalModules || item.files?.length || 0} completed</span>
              <span className="text-black">{item.progress?.percent || 0}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-black" style={{ width: `${item.progress?.percent || 0}%` }} />
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              {item.purchasedAt && (
                <div className="flex items-center justify-between gap-3">
                  <span>Purchased</span>
                  <span className="font-bold text-black">{formatDateTime(item.purchasedAt)}</span>
                </div>
              )}
              {item.expiresAt && (
                <div className="flex items-center justify-between gap-3">
                  <span>Expires</span>
                  <span className="font-bold text-black">{formatDate(item.expiresAt)}</span>
                </div>
              )}
              {item.progress?.openedModules > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span>Opened Modules</span>
                  <span className="font-bold text-black">{item.progress.openedModules}</span>
                </div>
              )}
              {item.certificateStatus && item.certificateStatus !== 'not-applicable' && (
                <div className="flex items-center justify-between gap-3">
                  <span>Certificate</span>
                  <span className="font-bold text-black capitalize">{String(item.certificateStatus).replace(/-/g, ' ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to={`/digital-library?product=${item.productId}`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
            >
              Open Full Library Workspace
            </Link>
            <Link
              to={getProductPath({ _id: item.productId })}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
            >
              View Product Page
            </Link>
            {supportEmailLink && (
              <a
                href={supportEmailLink}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
              >
                Email Trainer
              </a>
            )}
            {supportWhatsAppLink && (
              <a
                href={supportWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
              >
                WhatsApp Trainer
              </a>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default function OrderHistory() {
  const { customer, logout } = useCustomer();
  const signedIn = Boolean(customer?.accessToken);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState(customer?.phone || '');
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState('orders');
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityStatus, setActivityStatus] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [activitySort, setActivitySort] = useState('newest');
  const [activityView, setActivityView] = useState('grid');
  const [activityPage, setActivityPage] = useState(1);
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySort, setLibrarySort] = useState('newest');
  const [libraryView, setLibraryView] = useState('grid');
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);

  useEffect(() => {
    const syncLookupPhone = () => setLookupPhone(customer?.phone || '');
    syncLookupPhone();
  }, [customer?.phone]);

  useEffect(() => {
    if (!signedIn) {
      const clearSignedOutDashboard = () => {
        setOrders([]);
        setBookings([]);
        setLibrary([]);
        setLoaded(false);
        setError('');
        setSelectedActivity(null);
        setSelectedLibraryItem(null);
      };
      clearSignedOutDashboard();
      return;
    }

    let cancelled = false;

    const loadSignedInDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [historyResponse, libraryResponse] = await Promise.all([
          api.get('/api/customers/history', {
            headers: { 'x-customer-token': customer.accessToken },
          }),
          api.get('/api/products/digital/library', {
            headers: { 'x-customer-token': customer.accessToken },
          }),
        ]);

        if (cancelled) return;
        setOrders(Array.isArray(historyResponse.data?.orders) ? historyResponse.data.orders : []);
        setBookings(Array.isArray(historyResponse.data?.bookings) ? historyResponse.data.bookings : []);
        setLibrary(Array.isArray(libraryResponse.data) ? libraryResponse.data : []);
        setLookupPhone(historyResponse.data?.customer?.phone || customer?.phone || '');
        setLoaded(true);
      } catch (loadError) {
        if (!cancelled) {
          setOrders([]);
          setBookings([]);
          setLibrary([]);
          setLoaded(true);
          setError(loadError.response?.data?.message || 'Could not load your dashboard right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSignedInDashboard();

    return () => {
      cancelled = true;
    };
  }, [signedIn, customer?.accessToken, customer?.phone]);

  const lookupGuestOrders = async (phoneValue = lookupPhone) => {
    const targetPhone = phoneValue.trim();
    if (!targetPhone) {
      setError('Please enter your phone number to track your orders.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [ordersResponse, bookingsResponse] = await Promise.all([
        api.get(`/api/orders/customer/${targetPhone}`),
        api.get(`/api/training/bookings/customer/${targetPhone}`),
      ]);

      setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
      setLibrary([]);
      setLoaded(true);
      setMainTab('orders');
      setLookupPhone(targetPhone);
    } catch {
      setOrders([]);
      setBookings([]);
      setLoaded(true);
      setError('Could not load that phone number right now. Please check it and try again.');
    } finally {
      setLoading(false);
    }
  };

  const activityEntries = useMemo(() => {
    const orderEntries = orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const hasDigitalItems = items.some((item) => !!item.isDigital);
      const hasPhysicalItems = items.some((item) => !item.isDigital);
      const firstNames = items.slice(0, 2).map((item) => item.name).filter(Boolean);
      const summary = firstNames.length
        ? `${firstNames.join(', ')}${items.length > 2 ? ` and ${items.length - 2} more` : ''}`
        : 'Order details ready';

      return {
        id: `order-${order._id}`,
        entityType: 'order',
        primaryId: order.orderId || 'Order',
        title: items.length === 1 ? items[0]?.name || 'Customer order' : `${sumOrderQuantity(items)} item order`,
        summary,
        amount: Number(order.total) || 0,
        createdAt: order.createdAt,
        status: order.status || 'new',
        itemCount: sumOrderQuantity(items),
        hasDigitalItems,
        hasPhysicalItems,
        bookingType: '',
        raw: order,
        searchText: [
          order.orderId,
          order.fulfillment,
          order.deliveryZone,
          order.status,
          order.paymentPurpose,
          ...items.flatMap((item) => [item.name, item.variant, item.category, item.slug]),
        ].filter(Boolean).join(' ').toLowerCase(),
      };
    });

    const bookingEntries = bookings.map((booking) => ({
      id: `booking-${booking._id}`,
      entityType: 'booking',
      primaryId: booking.bookingId || 'Booking',
      title: booking.trainingTitle || booking.consultationTitle || 'Customer booking',
      summary: booking.notes || (booking.type === 'training' ? 'Training booking confirmed' : 'Consultation booking confirmed'),
      amount: Number(booking.amount) || 0,
      createdAt: booking.createdAt,
      status: 'paid',
      itemCount: 1,
      hasDigitalItems: false,
      hasPhysicalItems: false,
      bookingType: booking.type || 'consultation',
      raw: booking,
      searchText: [
        booking.bookingId,
        booking.trainingTitle,
        booking.consultationTitle,
        booking.type,
        booking.notes,
      ].filter(Boolean).join(' ').toLowerCase(),
    }));

    return [...orderEntries, ...bookingEntries];
  }, [bookings, orders]);

  const filteredActivities = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    const matchesFilter = (entry) => {
      if (activityFilter === 'orders') return entry.entityType === 'order';
      if (activityFilter === 'bookings') return entry.entityType === 'booking';
      if (activityFilter === 'training') return entry.entityType === 'booking' && entry.bookingType === 'training';
      if (activityFilter === 'digital') return entry.entityType === 'order' && entry.hasDigitalItems;
      return true;
    };

    const matchesStatus = (entry) => {
      if (activityStatus === 'all') return true;
      if (entry.entityType !== 'order') return false;
      if (activityStatus === 'active') return ACTIVE_ORDER_STATUSES.includes(entry.status);
      return entry.status === activityStatus;
    };

    const results = activityEntries.filter((entry) => (
      matchesFilter(entry) && matchesStatus(entry) && (!query || entry.searchText.includes(query))
    ));

    return [...results].sort((left, right) => {
      if (activitySort === 'oldest') return new Date(left.createdAt) - new Date(right.createdAt);
      if (activitySort === 'amountHigh') return (right.amount || 0) - (left.amount || 0);
      if (activitySort === 'amountLow') return (left.amount || 0) - (right.amount || 0);
      if (activitySort === 'status') {
        const leftPriority = left.entityType === 'order' ? (STATUS_PRIORITY[left.status] ?? 99) : 1;
        const rightPriority = right.entityType === 'order' ? (STATUS_PRIORITY[right.status] ?? 99) : 1;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return new Date(right.createdAt) - new Date(left.createdAt);
      }
      if (activitySort === 'name') return String(left.title || '').localeCompare(String(right.title || ''));
      return new Date(right.createdAt) - new Date(left.createdAt);
    });
  }, [activityEntries, activityFilter, activitySearch, activitySort, activityStatus]);

  const filteredLibrary = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    const results = library.filter((item) => {
      const matchesFilter = libraryFilter === 'all'
        || (libraryFilter === 'paid' && item.digitalAccessKind === 'paid')
        || (libraryFilter === 'trial' && item.digitalAccessKind === 'trial')
        || (libraryFilter === 'free' && item.digitalAccessKind === 'free')
        || (libraryFilter === 'certified' && item.isCertified);

      const searchText = [
        item.productName,
        item.productDesc,
        item.seriesTitle,
        item.seriesDescription,
        ...(item.files || []).flatMap((file) => [file.label, file.stepTitle, file.stepSummary]),
      ].filter(Boolean).join(' ').toLowerCase();

      return matchesFilter && (!query || searchText.includes(query));
    });

    return [...results].sort((left, right) => {
      if (librarySort === 'oldest') return new Date(left.purchasedAt || left.createdAt || 0) - new Date(right.purchasedAt || right.createdAt || 0);
      if (librarySort === 'progress') return (right.progress?.percent || 0) - (left.progress?.percent || 0);
      if (librarySort === 'lastAccessed') return new Date(right.lastAccessedAt || 0) - new Date(left.lastAccessedAt || 0);
      if (librarySort === 'name') return String(left.productName || '').localeCompare(String(right.productName || ''));
      if (librarySort === 'expiring') {
        const leftTime = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }
      return new Date(right.purchasedAt || right.createdAt || 0) - new Date(left.purchasedAt || left.createdAt || 0);
    });
  }, [library, libraryFilter, librarySearch, librarySort]);

  const activeOrders = useMemo(() => (
    orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status))
  ), [orders]);

  const currentOrder = activeOrders[0] || null;
  const totalSpent = useMemo(() => (
    orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    + bookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0)
  ), [bookings, orders]);

  const activityPageSize = activityView === 'grid' ? 8 : 6;
  const libraryPageSize = libraryView === 'grid' ? 8 : 6;
  const pagedActivities = filteredActivities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);
  const pagedLibrary = filteredLibrary.slice((libraryPage - 1) * libraryPageSize, libraryPage * libraryPageSize);

  useEffect(() => {
    const resetActivityPage = () => setActivityPage(1);
    resetActivityPage();
  }, [activityFilter, activityStatus, activitySearch, activitySort, activityView, mainTab]);

  useEffect(() => {
    if (activityFilter === 'bookings' || activityFilter === 'training') {
      setActivityStatus('all');
    }
  }, [activityFilter]);

  useEffect(() => {
    const resetLibraryPage = () => setLibraryPage(1);
    resetLibraryPage();
  }, [libraryFilter, librarySearch, librarySort, libraryView, mainTab]);

  return (
    <div className="min-h-screen bg-[#f6f1e6] pt-16">
      <SEO
        title="Customer Dashboard"
        description="Track Belle Kreyashon orders, bookings, and digital library access from one customer dashboard."
        url="/track"
        noindex
      />

      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(253,199,0,0.2),transparent_28%),linear-gradient(135deg,#0a0a0a_0%,#141414_45%,#2d2406_100%)] px-4 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FDC700]">Customer Dashboard</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Track every order, booking, and digital product from one smoother space.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base">
              Follow your current order, search past purchases, switch between orders and digital access, and open product details without jumping through different pages.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {signedIn ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#fcf7df] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                    <LayoutDashboard size={13} />
                    Signed In
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold text-black">{customer?.name || 'Belle Kreyashon Customer'}</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {customer?.phone || ''}{customer?.email ? ` • ${customer.email}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:border-black hover:text-black"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <StatCard label="Orders" value={orders.length} tone="bg-[#fcfbf7]" caption="Shop + digital purchases" onClick={() => setMainTab('orders')} />
                <StatCard label="Bookings" value={bookings.length} tone="bg-white" caption="Training and consultations" onClick={() => setMainTab('orders')} />
                <StatCard label="Digital Library" value={library.length} tone="bg-[#fff8dc]" caption="Protected products you can open" onClick={() => setMainTab('library')} />
                <StatCard label="Total Spent" value={currency(totalSpent)} tone="bg-[linear-gradient(135deg,#ffffff_0%,#fff8dc_100%)]" caption="Across orders and bookings" />
              </div>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#fefaf0_0%,#fff_52%,#f6eed0_100%)] p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                <Sparkles size={14} />
                Track An Order
              </div>

              {currentOrder ? (
                <>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-500">Current order in progress</p>
                      <h3 className="mt-1 text-2xl font-extrabold text-black">{currentOrder.orderId}</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {(currentOrder.items || []).slice(0, 2).map((item) => item.name).filter(Boolean).join(', ')}
                        {(currentOrder.items || []).length > 2 ? ` and ${(currentOrder.items || []).length - 2} more` : ''}
                      </p>
                    </div>
                    <StatusBadge status={currentOrder.status} />
                  </div>

                  <div className="mt-5">
                    <OrderProgress status={currentOrder.status} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Delivery</p>
                      <p className="mt-1 text-sm font-extrabold text-black">{currentOrder.deliveryZone || currentOrder.fulfillment}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(currentOrder.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Total</p>
                      <p className="mt-1 text-sm font-extrabold text-black">{currency(currentOrder.total)}</p>
                      <p className="mt-1 text-xs text-gray-500">{sumOrderQuantity(currentOrder.items)} item{sumOrderQuantity(currentOrder.items) === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedActivity(activityEntries.find((entry) => entry.entityType === 'order' && entry.raw._id === currentOrder._id) || null)}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
                  >
                    View Order Details
                    <ArrowRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-2xl font-extrabold text-black">No active delivery right now</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    Your current orders are all caught up. You can still browse older orders below, open your digital library, or come back here when a new order is on the way.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMainTab('orders')}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 hover:border-black hover:text-black"
                  >
                    Browse All Activity
                    <ChevronRight size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fcf7df] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                <ShieldCheck size={13} />
                Customer Access
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-black">Sign in for the full dashboard</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Your signed-in dashboard gives you one place for orders, bookings, and digital library access, with email-based account recovery and smoother product support.
              </p>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
              >
                Sign In / Create Account
              </button>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#fefaf0_0%,#fff_55%,#f6eed0_100%)] p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                <Phone size={14} />
                Quick Order Lookup
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-black">Track an order by phone number</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                If you are not ready to sign in yet, you can still load your order and booking activity with the same phone number you used during checkout.
              </p>
              <div className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={lookupPhone}
                    onChange={(event) => setLookupPhone(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && lookupGuestOrders()}
                    placeholder="e.g. 0241234567"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm outline-none focus:border-black"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => lookupGuestOrders()}
                  disabled={loading}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {loading ? '...' : 'Track'}
                </button>
              </div>
              {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-[34px] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Dashboard Views</p>
              <h2 className="mt-1 text-2xl font-extrabold text-black">Orders and digital access in one place</h2>
            </div>

            <div className="inline-flex rounded-2xl bg-[#fcfbf7] p-1">
              <button
                type="button"
                onClick={() => setMainTab('orders')}
                className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition-all ${mainTab === 'orders' ? 'bg-black text-white' : 'text-gray-500'}`}
              >
                Orders
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{activityEntries.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab('library')}
                className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition-all ${mainTab === 'library' ? 'bg-black text-white' : 'text-gray-500'}`}
              >
                Digital Library
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{library.length}</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center">
              <Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#FDC700]" />
              <p className="font-bold text-gray-600">Loading your dashboard...</p>
            </div>
          )}

          {!loading && mainTab === 'orders' && (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={activitySearch}
                    onChange={(event) => setActivitySearch(event.target.value)}
                    placeholder="Search order IDs, product names, booking titles, or notes..."
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                  />
                </div>
                <select
                  value={activitySort}
                  onChange={(event) => setActivitySort(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                >
                  {ACTIVITY_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="flex justify-start xl:justify-end">
                  <ViewToggle value={activityView} onChange={setActivityView} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ACTIVITY_FILTERS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActivityFilter(option.key)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${activityFilter === option.key ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-black'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {activityFilter !== 'bookings' && activityFilter !== 'training' && (
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_STATUS_FILTERS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActivityStatus(option.key)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${activityStatus === option.key ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-black'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {loaded && filteredActivities.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-gray-200 bg-[#fcfbf7] px-6 py-14 text-center">
                  <Package size={38} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-extrabold text-black">No matching order activity yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Try a different search, switch the activity filter, or check back after your next order or booking.
                  </p>
                </div>
              ) : (
                <>
                  <div className={activityView === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col gap-4'}>
                    {pagedActivities.map((entry) => (
                      <ActivityCard key={entry.id} entry={entry} view={activityView} onOpen={setSelectedActivity} />
                    ))}
                  </div>
                  <DashboardPaginator total={filteredActivities.length} page={activityPage} pageSize={activityPageSize} onChange={setActivityPage} />
                </>
              )}
            </div>
          )}

          {!loading && mainTab === 'library' && (
            signedIn ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      placeholder="Search library products, lessons, modules, or file names..."
                      className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] py-3 pl-10 pr-4 text-sm outline-none focus:border-black"
                    />
                  </div>
                  <select
                    value={librarySort}
                    onChange={(event) => setLibrarySort(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {LIBRARY_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <div className="flex justify-start xl:justify-end">
                    <ViewToggle value={libraryView} onChange={setLibraryView} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {LIBRARY_FILTERS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLibraryFilter(option.key)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${libraryFilter === option.key ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-black'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {filteredLibrary.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-gray-200 bg-[#fcfbf7] px-6 py-14 text-center">
                    <BookOpen size={38} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-extrabold text-black">No library items match right now</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Try a different keyword, switch the access filter, or buy a digital product to see it appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={libraryView === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col gap-4'}>
                      {pagedLibrary.map((item) => (
                        <LibraryCard key={item._id} item={item} view={libraryView} onOpen={setSelectedLibraryItem} />
                      ))}
                    </div>
                    <DashboardPaginator total={filteredLibrary.length} page={libraryPage} pageSize={libraryPageSize} onChange={setLibraryPage} />
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-gray-200 bg-[#fcfbf7] px-6 py-14 text-center">
                <BookOpen size={38} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-extrabold text-black">Sign in to unlock your digital library tab</h3>
                <p className="mt-2 text-sm text-gray-500">
                  The full library view is tied to your customer account so your protected files stay secure.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900"
                >
                  Sign In As Customer
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {selectedActivity && (
        <ActivityDetailModal
          entry={selectedActivity}
          signedIn={signedIn}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {selectedLibraryItem && (
        <LibraryDetailModal
          item={selectedLibraryItem}
          onClose={() => setSelectedLibraryItem(null)}
        />
      )}

      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSuccess={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
