import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MessageCircle, Phone, Clock, Users, Send, X, Loader2, CheckCircle } from 'lucide-react';
import { useFetch, api } from '../hooks/useApi';
import { WHATSAPP } from '../data/contact';
import CustomerModal from '../components/CustomerModal';
import { useCustomer } from '../context/CustomerContext';
import SEO from '../components/SEO';
import { getAttributionSnapshot } from '../utils/attribution';
import { getMarketingBrowserData, hasMarketingConsent, trackBeginCheckout, trackContactClick, trackServicePurchase } from '../utils/marketing';
import { buildBreadcrumbSchema, buildCollectionPageSchema } from '../utils/seoPaths';

const WHATSAPP_NUM = WHATSAPP;

const SUBSCRIPTION_PLANS = [
  { label: '1 Month',   months: 1,  badge: '' },
  { label: '3 Months',  months: 3,  badge: 'Popular' },
  { label: '6 Months',  months: 6,  badge: 'Best Value' },
  { label: '9 Months',  months: 9,  badge: '' },
  { label: '12 Months', months: 12, badge: 'Premium' },
];

// Paystack payment helper
const waitForPaystack = () => new Promise((resolve, reject) => {
  if (window.PaystackPop) return resolve(window.PaystackPop);
  let tries = 0;
  const interval = setInterval(() => {
    if (window.PaystackPop) { clearInterval(interval); resolve(window.PaystackPop); }
    else if (++tries > 30) { clearInterval(interval); reject(new Error('Paystack not loaded')); }
  }, 100);
});

const payWithPaystack = ({ amount, name, phone, description, onSuccess, onClose, onBeforeOpen }) => {
  waitForPaystack().then(PaystackPop => {
    const handler = PaystackPop.setup({
      key:      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email:    phone.replace(/[^0-9]/g,'') + '@bellekreyashon.com',
      amount:   amount * 100,
      currency: 'GHS',
      ref:      'BK-' + Date.now(),
      callback: onSuccess,
      onClose,
    });
    onBeforeOpen?.();
    handler.openIframe();
  }).catch(() => alert('Payment system not ready. Please refresh the page.'));
};

// Booking confirmation modal
function BookingConfirmed({ booking, whatsappUrl, onClose }) {
  useEffect(() => {
    if (!booking?.bookingId) return;
    trackServicePurchase({ booking });
  }, [booking]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="font-extrabold text-lg">Booking Confirmed!</h3>
          <p className="text-gray-400 text-sm mt-1">Booking ID: <span className="font-bold text-black">{booking.bookingId}</span></p>
        </div>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white font-extrabold rounded-xl hover:bg-green-600 mb-3"
          onClick={onClose}>
          <MessageCircle size={16} /> Notify Belle Kreyashon via WhatsApp
        </a>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-500 hover:text-black">Close</button>
      </div>
    </div>
  );
}

function TrainingDetailsModal({ event, onClose, onRegister }) {
  const { customer } = useCustomer();
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const startRegistration = () => {
    if (!customer) {
      setShowCustomerModal(true);
      return;
    }
    onRegister(event);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[100dvh] sm:max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start gap-4 p-4 sm:p-6 pb-4 border-b border-gray-100 shrink-0">
            <div>
              <p className="text-[#FDC700] text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Training Details</p>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight">{event.title}</h3>
            </div>
            <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-black" /></button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5 space-y-5">
            {event.image && (
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-2 sm:p-3">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full max-h-[30vh] sm:max-h-[42vh] object-contain rounded-xl"
                />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 min-w-0"><Calendar size={15} className="text-gray-400 shrink-0" /> <span className="break-words">{event.date}</span></div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 min-w-0"><Clock size={15} className="text-gray-400 shrink-0" /> <span className="break-words">{event.venue}</span></div>
              {event.capacity && <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 min-w-0"><Users size={15} className="text-gray-400 shrink-0" /> <span className="break-words">{event.capacity} spots available</span></div>}
              <div className="bg-gray-50 rounded-xl p-3 font-extrabold text-black">GHS {event.price?.toLocaleString()}</div>
            </div>

            {(event.partners?.length > 0 || event.sponsors?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {event.partners?.length > 0 && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 break-words">
                    Partners: {event.partners.join(', ')}
                  </span>
                )}
                {event.sponsors?.length > 0 && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 break-words">
                    Sponsors: {event.sponsors.join(', ')}
                  </span>
                )}
              </div>
            )}

            <div>
              <h4 className="font-extrabold text-sm mb-2">About this training</h4>
              <div className="text-sm sm:text-[15px] text-gray-600 leading-7 whitespace-pre-line break-words">
                {event.desc || 'Full training details will be shared here before registration.'}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-100 p-4 sm:p-6 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {event.price > 0 ? (
                <button onClick={startRegistration}
                  className="flex-1 py-3 bg-[#FDC700] text-black font-extrabold rounded-xl hover:bg-yellow-300">
                  Proceed to Register
                </button>
              ) : (
                <a href={`https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(`Hi! I'd like to register for: ${event.title}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-3 bg-black text-white font-extrabold rounded-xl hover:bg-gray-900 text-center">
                  Enquire on WhatsApp
                </a>
              )}
              <button onClick={onClose} className="sm:w-auto py-3 px-5 border border-gray-200 text-sm font-bold rounded-xl hover:border-black">
                Close
              </button>
            </div>

            {!customer && event.price > 0 && (
              <p className="text-xs text-gray-400">
                We&apos;ll ask for your saved name and phone number before payment so registration stays quick and accurate.
              </p>
            )}
          </div>
        </div>
      </div>

      {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} />}
    </>
  );
}

// Training registration modal
function TrainingModal({ event, onClose }) {
  const { customer } = useCustomer();
  const [name,    setName]    = useState(customer?.name || '');
  const [phone,   setPhone]   = useState(customer?.phone || '');
  const [loading, setLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const pay = () => {
    if (!name.trim() || !phone.trim()) return alert('Please enter your name and phone number');
    setLoading(true);
    const sourceAttribution = getAttributionSnapshot();
    payWithPaystack({
      amount: event.price,
      name, phone,
      description: `Training: ${event.title}`,
      onBeforeOpen: () => {
        trackBeginCheckout({
          items: [{
            productId: event._id,
            name: event.title,
            brand: 'Belle Kreyashon',
            category: 'Training',
            qty: 1,
            price: Number(event.price || 0) || 0,
          }],
          value: Number(event.price || 0) || 0,
          customer: {
            name,
            phone,
            email: customer?.email || '',
          },
          source: 'training_registration',
          contentType: 'service',
        });
      },
      onSuccess: (response) => {
        api.post('/api/training/book/verify', {
          paymentRef: response.reference,
          bookingData: {
            type: 'training',
            trainingId: event._id,
            trainingTitle: event.title,
            customer: { name, phone },
            amount: event.price,
            sourceAttribution,
            browserData: getMarketingBrowserData(),
            marketingConsent: hasMarketingConsent(),
          },
        }).then(res => {
          setLoading(false);
          setConfirmed(res.data);
        }).catch(() => {
          setLoading(false);
          alert('Payment received but booking failed. Ref: ' + response.reference + '. Contact us on WhatsApp.');
        });
      },
      onClose: () => setLoading(false),
    });
  };

  if (confirmed) return <BookingConfirmed booking={confirmed.booking} whatsappUrl={confirmed.whatsappUrl} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-extrabold text-base">Register for Training</h3>
            <p className="text-xs text-gray-400 mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-black" /></button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2"><Calendar size={13} /> {event.date}</div>
          <div className="flex items-center gap-2"><Clock size={13} /> {event.venue}</div>
          {event.partners?.length > 0 && <div><span className="font-bold text-gray-500">Partners:</span> {event.partners.join(', ')}</div>}
          {event.sponsors?.length > 0 && <div><span className="font-bold text-gray-500">Sponsors:</span> {event.sponsors.join(', ')}</div>}
          <div className="flex items-center gap-2 font-extrabold text-black text-sm"><span>GHS {event.price?.toLocaleString()}</span></div>
        </div>
        <div className="flex flex-col gap-3 mb-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name *"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone / WhatsApp *"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
        </div>
        <button onClick={pay} disabled={loading}
          className="w-full py-3.5 bg-[#FDC700] text-black font-extrabold rounded-xl hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : `Pay GHS ${event.price?.toLocaleString()} & Register`}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Secured by Paystack — Card & Mobile Money</p>
      </div>
    </div>
  );
}

// Consultation booking modal
function ConsultationModal({ consultation, onClose }) {
  const { customer } = useCustomer();
  const [name,    setName]    = useState(customer?.name || '');
  const [phone,   setPhone]   = useState(customer?.phone || '');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const pay = () => {
    if (!name.trim() || !phone.trim()) return alert('Please enter your name and phone number');
    setLoading(true);
    const sourceAttribution = getAttributionSnapshot();
    payWithPaystack({
      amount: consultation.price,
      name, phone,
      description: `Consultation: ${consultation.title}`,
      onBeforeOpen: () => {
        trackBeginCheckout({
          items: [{
            productId: consultation._id,
            name: consultation.title,
            brand: 'Belle Kreyashon',
            category: 'Consultation',
            qty: 1,
            price: Number(consultation.price || 0) || 0,
          }],
          value: Number(consultation.price || 0) || 0,
          customer: {
            name,
            phone,
            email: customer?.email || '',
          },
          source: 'consultation_booking',
          contentType: 'service',
        });
      },
      onSuccess: (response) => {
        api.post('/api/training/book/verify', {
          paymentRef: response.reference,
          bookingData: {
            type: 'consultation',
            consultationId: consultation._id,
            consultationTitle: consultation.title,
            customer: { name, phone },
            amount: consultation.price,
            notes,
            sourceAttribution,
            browserData: getMarketingBrowserData(),
            marketingConsent: hasMarketingConsent(),
          },
        }).then(res => {
          setLoading(false);
          setConfirmed(res.data);
        }).catch(() => {
          setLoading(false);
          alert('Payment received but booking failed. Ref: ' + response.reference + '. Contact us on WhatsApp.');
        });
      },
      onClose: () => setLoading(false),
    });
  };

  if (confirmed) return <BookingConfirmed booking={confirmed.booking} whatsappUrl={confirmed.whatsappUrl} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-extrabold text-base">Book Consultation</h3>
            <p className="text-xs text-gray-400 mt-0.5">{consultation.title}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-black" /></button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
          {consultation.duration && <div className="flex items-center gap-2"><Clock size={13} /> {consultation.duration}</div>}
          {consultation.validity && <div className="flex items-center gap-2"><Calendar size={13} /> {consultation.validity}</div>}
          <div className="font-extrabold text-black text-sm">GHS {consultation.price?.toLocaleString()}</div>
        </div>
        <div className="flex flex-col gap-3 mb-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name *"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone / WhatsApp *"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="What would you like to discuss? (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black resize-none" />
        </div>
        <button onClick={pay} disabled={loading}
          className="w-full py-3.5 bg-[#FDC700] text-black font-extrabold rounded-xl hover:bg-yellow-300 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : `Pay GHS ${consultation.price?.toLocaleString()} & Book`}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Secured by Paystack — Card & Mobile Money</p>
      </div>
    </div>
  );
}

export default function Services() {
  const { data: events }   = useFetch('/api/training/public');
  const { data: consults } = useFetch('/api/consultation/public');
  const [trainPage,   setTrainPage]   = useState(1);
  const [consultPage, setConsultPage] = useState(1);
  const TRAIN_PAGE_SIZE   = 6;
  const CONSULT_PAGE_SIZE = 4;
  const { customer }       = useCustomer();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedTraining,   setSelectedTraining]   = useState(null);
  const [trainingToRegister, setTrainingToRegister] = useState(null);
  const [selectedConsult,    setSelectedConsult]    = useState(null);
  const [featurePlan,        setFeaturePlan]        = useState(null);
  const [featureForm,        setFeatureForm]        = useState({ brand:'', product:'', desc:'', contact:'', plan:'' });
  const [preOrderForm,       setPreOrderForm]       = useState({ item:'', qty:'', date:'', contact:'', notes:'' });
  const [showPreOrderForm,   setShowPreOrderForm]   = useState(false);

  const freeMsg   = encodeURIComponent("Hi Belle Kreyashon! I'd like to book a free consultation. Please advise on availability.");
  const importMsg = encodeURIComponent("Hi Belle Kreyashon! I'd like to inquire about importation assistance.");
  const seoSchema = [
    buildCollectionPageSchema({
      name: 'Professional Training, Consultations & Importation',
      description: 'Book practical, business-focused training across different niches, plus consultations, pre-orders and importation support.',
      path: '/services',
    }),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ]),
  ];

  const handleTrainingClick = (evt) => setSelectedTraining(evt);

  const handleConsultClick = (c) => {
    if (!customer) { setShowCustomerModal(true); return; }
    setSelectedConsult(c);
  };

  const sendFeatureApp = () => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.months === featurePlan);
    const msg = encodeURIComponent(
`🌟 FEATURE APPLICATION — Belle Kreyashon Platform
Brand: ${featureForm.brand}
Product/Service: ${featureForm.product}
Description: ${featureForm.desc}
Contact: ${featureForm.contact}
Plan: ${plan?.label} subscription`
    );
    const url = `https://wa.me/${WHATSAPP_NUM}?text=${msg}`;
    trackContactClick({
      channel: 'whatsapp',
      label: 'Feature application WhatsApp',
      url,
    });
    window.open(url, '_blank');
  };

  const sendPreOrder = () => {
    const msg = encodeURIComponent(
`📦 PRE-ORDER REQUEST — Belle Kreyashon
Item: ${preOrderForm.item}
Quantity: ${preOrderForm.qty}
Needed by: ${preOrderForm.date}
Contact: ${preOrderForm.contact}
Notes: ${preOrderForm.notes || 'None'}`
    );
    const url = `https://wa.me/${WHATSAPP_NUM}?text=${msg}`;
    trackContactClick({
      channel: 'whatsapp',
      label: 'Pre-order request WhatsApp',
      url,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="pt-16 min-h-screen">
      <SEO
        title="Professional Training, Consultations & Importation"
        description="Book practical, business-focused training across different niches, plus consultations, pre-orders and importation support."
        url="/services"
        keywords="beauty training Ghana, business consultations Accra, importation support Ghana, practical skill training Ghana, Belle Kreyashon services"
        schema={seoSchema}
      />
      <div className="bg-black text-white py-20 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Grow With Us</p>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-3">Services</h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          Training, consultations, importation, pre-orders and brand features — hair, beauty, fashion, health &amp; more
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* TRAINING */}
        <div className="mb-16">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">Learn From The Best</p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Professional Training Sessions</h2>
          <p className="text-gray-500 text-sm mb-7 max-w-2xl">
            Our training is practical and business-focused, and it is not limited to one niche. Depending on the session, it can cover beauty, fashion, business, product knowledge or any other specialist area designed to build real skill, confidence and income opportunities.
          </p>

          {!events || events.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Calendar size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-bold">No upcoming training sessions right now</p>
              <p className="text-gray-300 text-sm mt-1">WhatsApp us to enquire about future dates</p>
              <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-black text-white font-bold rounded-full text-sm">
                <MessageCircle size={15} /> Enquire Now
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(events || []).slice((trainPage-1)*TRAIN_PAGE_SIZE, trainPage*TRAIN_PAGE_SIZE).map(evt => (
                <motion.div key={evt._id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleTrainingClick(evt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTrainingClick(evt);
                    }
                  }}
                  role="button"
                  tabIndex={0}>
                  {evt.image && <div className="aspect-video bg-gray-100 overflow-hidden"><img src={evt.image} alt={evt.title} className="w-full h-full object-cover" /></div>}
                  <div className="p-5">
                    <h3 className="font-extrabold text-base mb-1">{evt.title}</h3>
                    {evt.desc && <p className="text-gray-400 text-xs mb-3 line-clamp-2">{evt.desc}</p>}
                    <div className="flex flex-col gap-1 mb-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {evt.date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {evt.venue}</span>
                      {evt.capacity && <span className="flex items-center gap-1.5"><Users size={13} /> {evt.capacity} spots</span>}
                    </div>
                    {(evt.partners?.length > 0 || evt.sponsors?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {evt.partners?.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                            Partners: {evt.partners.join(', ')}
                          </span>
                        )}
                        {evt.sponsors?.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                            Sponsors: {evt.sponsors.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-lg">GHS {evt.price?.toLocaleString()}</span>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleTrainingClick(evt);
                      }}
                        className="px-4 py-2 bg-[#FDC700] text-black font-extrabold text-xs rounded-xl hover:bg-yellow-300 flex items-center gap-1">
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {(events?.length||0) > TRAIN_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setTrainPage(p => Math.max(1,p-1))} disabled={trainPage===1}
                className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">← Prev</button>
              <span className="text-sm font-bold text-gray-500">{trainPage} / {Math.ceil((events?.length||0)/TRAIN_PAGE_SIZE)}</span>
              <button onClick={() => setTrainPage(p => Math.min(Math.ceil((events?.length||0)/TRAIN_PAGE_SIZE),p+1))} disabled={trainPage===Math.ceil((events?.length||0)/TRAIN_PAGE_SIZE)}
                className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>

        {/* CONSULTATIONS */}
        <div className="mb-16">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-1">Expert Guidance</p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Consultations</h2>
          <p className="text-gray-500 text-sm mb-7 max-w-2xl">
            Not sure what to buy, how to grow your beauty or fashion business, or where to start? Our consultations give you direct access to expert advice across hair, skincare, fashion, health and lifestyle.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            {/* Free */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center mb-3"><MessageCircle size={20} className="text-[#FDC700]" /></div>
              <h3 className="font-extrabold text-lg mb-1">Free Consultation</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                Quick question about any of our products — hair, beauty, skincare, fashion, health or gadgets? Chat with us for free — no appointment needed.
              </p>
              <div className="flex gap-2">
                <a href={`https://wa.me/${WHATSAPP_NUM}?text=${freeMsg}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-green-500 text-white font-extrabold text-xs rounded-xl text-center hover:bg-green-600">WhatsApp</a>
                <a href={`tel:+${WHATSAPP_NUM}`} className="flex-1 py-2.5 bg-black text-white font-extrabold text-xs rounded-xl text-center hover:bg-gray-900">Call Us</a>
              </div>
            </div>

            {/* Paid consultations */}
            {(consults || []).slice((consultPage-1)*CONSULT_PAGE_SIZE, consultPage*CONSULT_PAGE_SIZE).map(c => (
              <div key={c._id} className="bg-black rounded-2xl p-6 text-white">
                <div className="w-11 h-11 rounded-2xl bg-[#FDC700] flex items-center justify-center mb-3"><Users size={20} className="text-black" /></div>
                <h3 className="font-extrabold text-lg mb-1">{c.title}</h3>
                {c.duration && <p className="text-xs text-gray-400 mb-0.5">Duration: {c.duration}</p>}
                {c.validity && <p className="text-xs text-gray-400 mb-1">{c.validity}</p>}
                <p className="text-gray-400 text-sm mb-3 leading-relaxed line-clamp-3">{c.desc}</p>
                <p className="text-[#FDC700] font-extrabold text-2xl mb-4">GHS {c.price?.toLocaleString()}</p>
                <button onClick={() => handleConsultClick(c)}
                  className="block w-full py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl text-center hover:bg-yellow-300">
                  Book Now — Pay GHS {c.price?.toLocaleString()}
                </button>
              </div>
            ))}
          </div>
          {(consults?.length||0) > CONSULT_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setConsultPage(p => Math.max(1,p-1))} disabled={consultPage===1}
                className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">← Prev</button>
              <span className="text-sm font-bold text-gray-500">{consultPage} / {Math.ceil((consults?.length||0)/CONSULT_PAGE_SIZE)}</span>
              <button onClick={() => setConsultPage(p => Math.min(Math.ceil((consults?.length||0)/CONSULT_PAGE_SIZE),p+1))} disabled={consultPage===Math.ceil((consults?.length||0)/CONSULT_PAGE_SIZE)}
                className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>

        {/* PRE-ORDER REQUEST */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white">
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Can't Find It?</p>
            <h2 className="text-2xl font-extrabold mb-2">Request a Pre-Order</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xl">
              Don't see what you're looking for across hair, beauty, fashion, health or gadgets? Submit a pre-order request and we'll source it for you.
            </p>
            {!showPreOrderForm ? (
              <button onClick={() => setShowPreOrderForm(true)} className="px-6 py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-full hover:bg-yellow-300">Submit a Request</button>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
                <input value={preOrderForm.item} onChange={e => setPreOrderForm(f => ({...f, item: e.target.value}))} placeholder="What item do you need? *" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <input value={preOrderForm.qty} onChange={e => setPreOrderForm(f => ({...f, qty: e.target.value}))} placeholder="Quantity" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <input value={preOrderForm.date} onChange={e => setPreOrderForm(f => ({...f, date: e.target.value}))} placeholder="Needed by (date)" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <input value={preOrderForm.contact} onChange={e => setPreOrderForm(f => ({...f, contact: e.target.value}))} placeholder="Your phone/WhatsApp *" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <textarea value={preOrderForm.notes} onChange={e => setPreOrderForm(f => ({...f, notes: e.target.value}))} placeholder="Additional notes (colour, size, brand, etc.)" rows={2} className="sm:col-span-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700] resize-none" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={sendPreOrder} className="flex items-center gap-2 px-5 py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl hover:bg-yellow-300"><Send size={15} /> Send via WhatsApp</button>
                  <button onClick={() => setShowPreOrderForm(false)} className="px-4 py-3 bg-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/20">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IMPORTATION */}
        <div className="mb-16">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Global Sourcing</p>
            <h2 className="text-2xl font-extrabold mb-2">Importation Assistance</h2>
            <p className="text-gray-500 text-sm mb-5 max-w-xl leading-relaxed">
              Need help importing hair products, beauty supplies, skincare, fashion items, gadgets or equipment from abroad? We assist with sourcing, shipping and customs clearance.
            </p>
            <a href={`https://wa.me/${WHATSAPP_NUM}?text=${importMsg}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-extrabold text-sm rounded-full hover:bg-gray-900">
              <MessageCircle size={16} /> Enquire on WhatsApp
            </a>
          </div>
        </div>

        {/* FEATURE YOUR BRAND */}
        <div id="feature" className="mb-8">
          <div className="bg-black text-white rounded-2xl p-8">
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Visibility for Your Brand</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Get Featured on Belle Kreyashon</h2>
            <p className="text-gray-400 text-sm mb-4 max-w-2xl leading-relaxed">
              Have a product you want more people to see? Get featured on our home page, seen by thousands of shoppers across hair, beauty, fashion, health and lifestyle. Your brand identity stays private.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {SUBSCRIPTION_PLANS.map(plan => (
                <button key={plan.months} onClick={() => setFeaturePlan(plan.months)}
                  className={`relative rounded-2xl p-4 text-center border-2 transition-all ${featurePlan === plan.months ? 'bg-[#FDC700] border-[#FDC700] text-black' : 'border-gray-700 bg-white/5 text-white hover:bg-white/10'}`}>
                  {plan.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{plan.badge}</span>}
                  <div className="font-extrabold text-sm">{plan.label}</div>
                </button>
              ))}
            </div>
            {featurePlan && (
              <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
                <input value={featureForm.brand} onChange={e => setFeatureForm(f => ({...f, brand: e.target.value}))} placeholder="Brand / Business name *" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <input value={featureForm.contact} onChange={e => setFeatureForm(f => ({...f, contact: e.target.value}))} placeholder="Your WhatsApp / contact *" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <input value={featureForm.product} onChange={e => setFeatureForm(f => ({...f, product: e.target.value}))} placeholder="Product or service to feature *" className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700]" />
                <textarea value={featureForm.desc} onChange={e => setFeatureForm(f => ({...f, desc: e.target.value}))} placeholder="Tell us about your product" rows={2} className="sm:col-span-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-gray-400 outline-none focus:border-[#FDC700] resize-none" />
                <div className="sm:col-span-2">
                  <button onClick={sendFeatureApp} className="flex items-center gap-2 px-6 py-3 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl hover:bg-yellow-300">
                    <Send size={15} /> Apply via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} />}
      {selectedTraining && (
        <TrainingDetailsModal
          event={selectedTraining}
          onClose={() => setSelectedTraining(null)}
          onRegister={(event) => {
            setSelectedTraining(null);
            setTrainingToRegister(event);
          }}
        />
      )}
      {trainingToRegister && <TrainingModal event={trainingToRegister} onClose={() => setTrainingToRegister(null)} />}
      {selectedConsult   && <ConsultationModal consultation={selectedConsult} onClose={() => setSelectedConsult(null)} />}
    </div>
  );
}
