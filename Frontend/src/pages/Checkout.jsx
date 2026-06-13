import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Globe, Landmark, Loader2, MapPin, MessageCircle, Package, Smartphone, Ticket, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useIntlPreferences } from '../context/IntlContext';
import { api, useFetch } from '../hooks/useApi';
import { getAttributionSnapshot } from '../utils/attribution';
import { getMarketingBrowserData, hasMarketingConsent, trackBeginCheckout } from '../utils/marketing';
import CustomerModal from '../components/CustomerModal';

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const CONTACT_STORAGE_KEY = 'bk_checkout_contact';

const readStoredContact = () => {
  try { return JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY)) || {}; }
  catch { return {}; }
};

function validatePhone(raw = '') {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Phone number is required';
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number contains invalid characters';
  if (cleaned.startsWith('0') && cleaned.length !== 10) return 'Ghana numbers should contain 10 digits';
  if (cleaned.startsWith('+') && (cleaned.length < 8 || cleaned.length > 16)) return 'International phone number looks incorrect';
  return null;
}

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export default function Checkout() {
  const { cart, subtotal, clearCart } = useCart();
  const { customer, saveAddress, savePreferences } = useCustomer();
  const { formatMoney, formatBaseMoney, ghanaCheckoutNote, isConvertedDisplay } = useIntlPreferences();
  const navigate = useNavigate();
  const { data: zones } = useFetch('/api/delivery/public');
  const storedContact = useMemo(readStoredContact, []);

  const [contact, setContact] = useState({
    name: customer?.name || storedContact.name || '',
    phone: customer?.phone || storedContact.phone || '',
    email: customer?.email || storedContact.email || '',
  });
  const [fulfillment, setFulfillment] = useState('delivery');
  const [zone, setZone] = useState('');
  const [address, setAddress] = useState(customer?.savedAddress || storedContact.address || '');
  const [billingAddress, setBillingAddress] = useState(customer?.billingAddress || storedContact.billingAddress || '');
  const [saveAddr, setSaveAddr] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [serverQuote, setServerQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState('login');

  const signedIn = Boolean(customer?.accessToken);
  const hasDigitalItems = cart.some((item) => item.isDigital);
  const hasPhysicalItems = cart.some((item) => !item.isDigital);
  const hasTrialItems = cart.some((item) => item.isDigital && item.digitalAccessKind === 'trial');
  const digitalOnly = hasDigitalItems && !hasPhysicalItems;
  const freeOnlyDigital = digitalOnly && cart.every((item) => item.digitalAccessKind === 'free');
  const hasDeliveryZones = Array.isArray(zones) && zones.length > 0;
  const selectedZone = zones?.find((item) => item._id === zone);
  const localDeliveryFee = digitalOnly || fulfillment !== 'delivery' ? 0 : Number(selectedZone?.fee || 0);
  const displaySubtotal = Number(serverQuote?.subtotal ?? subtotal);
  const displayDelivery = Number(serverQuote?.deliveryFee ?? localDeliveryFee);
  const displayDiscount = Number(serverQuote?.discountTotal || 0);
  const displayTotal = Number(serverQuote?.expectedPaymentAmount ?? (displaySubtotal + displayDelivery - displayDiscount));

  useEffect(() => {
    if (signedIn) {
      setContact({ name: customer.name || '', phone: customer.phone || '', email: customer.email || '' });
      setAddress(customer.savedAddress || '');
      setBillingAddress(customer.billingAddress || '');
    }
  }, [signedIn, customer?.name, customer?.phone, customer?.email, customer?.savedAddress, customer?.billingAddress]);

  useEffect(() => {
    if (!signedIn) {
      try { localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify({ ...contact, address, billingAddress })); }
      catch { /* Storage can be unavailable in private browsing. */ }
    }
  }, [signedIn, contact, address, billingAddress]);

  useEffect(() => {
    if (!sessionStorage.getItem('bk_pending_order') && cart.length === 0) navigate('/shop');
  }, [cart.length, navigate]);

  useEffect(() => {
    if (digitalOnly) return;
    if (fulfillment === 'delivery' && !hasDeliveryZones) setFulfillment('pickup');
  }, [digitalOnly, fulfillment, hasDeliveryZones]);

  useEffect(() => {
    if (hasTrialItems) setPaymentMethod('card');
  }, [hasTrialItems]);

  useEffect(() => {
    setServerQuote(null);
    setAppliedCoupon(null);
    setCouponMessage('');
  }, [cart, fulfillment, zone, address]);

  useEffect(() => {
    if (!cart.length || (!contact.phone && !contact.email)) return undefined;
    const timer = setTimeout(() => {
      api.post('/api/orders/abandoned', {
        ...contact,
        items: cart.map((item) => ({
          productId: item.productId,
          slug: item.slug || '',
          name: item.name,
          qty: item.qty,
          price: item.price,
          image: item.image || '',
          variant: item.variant || '',
          isWholesale: !!item.isWholesale,
          isDigital: !!item.isDigital,
          digitalAccessKind: item.digitalAccessKind || '',
        })),
        sourceAttribution: getAttributionSnapshot(),
      }).catch(() => {});
    }, 20_000);
    return () => clearTimeout(timer);
  }, [cart, contact]);

  const openCustomerAuth = (mode) => {
    setCustomerModalMode(mode);
    setShowCustomerModal(true);
  };

  const validate = () => {
    if (!contact.name.trim()) return 'Please enter your name';
    const phoneError = validatePhone(contact.phone);
    if (phoneError) return phoneError;
    if (!isValidEmail(contact.email)) return 'Please enter a valid email address';
    if (!digitalOnly && fulfillment === 'delivery' && !zone) return 'Please select a delivery zone';
    if (!digitalOnly && ['delivery', 'international'].includes(fulfillment) && !address.trim()) return 'Please enter the delivery address';
    return null;
  };

  const buildOrderData = () => {
    const checkoutAttribution = getAttributionSnapshot();
    const itemAttributions = cart.map((item) => item.sourceAttribution || checkoutAttribution);
    const sourcePages = [...new Set(itemAttributions.map((item) => item?.sourcePath || item?.sourcePage || '').filter(Boolean))];
    const primaryAttribution = itemAttributions.find((item) => item?.utmCampaign || item?.utmSource) || itemAttributions[0] || checkoutAttribution;
    return {
      customer: { ...contact, billingAddress: billingAddress.trim() },
      address: digitalOnly ? 'DIGITAL ACCESS' : address.trim(),
      items: cart.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        isWholesale: !!item.isWholesale,
        variant: item.variant || null,
        accessType: item.accessType || null,
        accessMonths: item.accessMonths || null,
        sourceAttribution: item.sourceAttribution || checkoutAttribution,
      })),
      fulfillment: digitalOnly ? 'digital' : fulfillment,
      deliveryZoneId: fulfillment === 'delivery' ? zone : '',
      couponCode: appliedCoupon?.code || couponCode.trim(),
      sourceAttribution: primaryAttribution,
      sourcePages,
      browserData: getMarketingBrowserData(),
      marketingConsent: hasMarketingConsent(),
    };
  };

  const authConfig = signedIn ? {
    headers: {
      'x-customer-token': customer.accessToken,
      Authorization: `Bearer ${customer.accessToken}`,
    },
  } : undefined;

  const applyCoupon = async () => {
    const validationError = validate();
    if (validationError && !/delivery address/i.test(validationError)) return setCouponMessage(validationError);
    if (!couponCode.trim()) return setCouponMessage('Enter a coupon code first');
    setCouponLoading(true);
    setCouponMessage('');
    try {
      const { data } = await api.post('/api/orders/quote', { orderData: buildOrderData() }, authConfig);
      setServerQuote(data.quote);
      setAppliedCoupon(data.quote.coupon);
      setCouponCode(data.quote.coupon?.code || couponCode.trim().toUpperCase());
      setCouponMessage(data.quote.coupon ? `${data.quote.coupon.code} applied successfully` : 'Coupon checked');
    } catch (couponError) {
      setAppliedCoupon(null);
      setServerQuote(null);
      setCouponMessage(couponError.response?.data?.message || 'Coupon could not be applied');
    } finally {
      setCouponLoading(false);
    }
  };

  const finishWithoutPaystack = (data) => {
    sessionStorage.setItem('bk_last_order', JSON.stringify({
      order: data.order,
      payment: data.payment,
      whatsappUrl: data.whatsappUrl,
      callUrl: data.callUrl,
    }));
    clearCart();
    navigate('/order-confirmed');
  };

  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError('');
    setLoading(true);
    try {
      const orderData = buildOrderData();
      const { data } = await api.post('/api/orders/checkout', { orderData, paymentMethod }, authConfig);
      setServerQuote(data.order);
      trackBeginCheckout({ items: data.order?.items || [], value: data.payment?.expectedAmount || 0, customer: contact, source: paymentMethod });

      if (!digitalOnly && signedIn && saveAddr && address.trim()) await saveAddress(address.trim()).catch(() => {});
      if (signedIn && billingAddress.trim()) await savePreferences({ billingAddress: billingAddress.trim() }).catch(() => {});
      if (data.payment?.method === 'free' || data.payment?.method === 'bank_transfer') {
        finishWithoutPaystack(data);
        return;
      }
      if (!window.PaystackPop || !PAYSTACK_KEY) throw new Error('Payment system is not ready. Please refresh and try again.');

      const paystackChannels = data.payment.method === 'card'
        ? ['card']
        : data.payment.method === 'mobile_money'
          ? ['mobile_money']
          : undefined;
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: contact.email.trim(),
        amount: Math.round(Number(data.payment.expectedAmount || 0) * 100),
        currency: 'GHS',
        ref: data.payment.reference,
        channels: paystackChannels,
        metadata: {
          checkout_context: 'shop_order',
          order_id: data.order?._id || '',
          order_number: data.order?.orderId || '',
          customer_name: contact.name,
          customer_phone: contact.phone,
        },
        callback: (response) => {
          sessionStorage.setItem('bk_pending_order', JSON.stringify({ paymentRef: response.reference }));
          navigate('/order-confirmed');
        },
        onClose: () => setLoading(false),
      });
      setLoading(false);
      handler.openIframe();
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || 'Checkout could not start');
      setLoading(false);
    }
  };

  if (!sessionStorage.getItem('bk_pending_order') && cart.length === 0) return null;

  const fulfillmentOptions = [
    { value: 'pickup', label: 'Pickup', description: 'Collect from Osu, Accra', icon: Package },
    ...(hasDeliveryZones ? [{ value: 'delivery', label: 'Delivery', description: 'Priced by zone', icon: MapPin }] : []),
    { value: 'arranged-delivery', label: 'Arrange Delivery', description: 'Confirm a rider on WhatsApp', icon: MessageCircle },
    { value: 'international', label: 'International', description: 'Courier arranged after order', icon: Globe },
  ];
  const paymentOptions = hasTrialItems ? [
    { value: 'card', label: 'Card', description: 'Required for reusable trial billing', icon: CreditCard },
  ] : [
    { value: 'paystack', label: 'Paystack', description: 'Choose card or Mobile Money securely', icon: CreditCard },
    { value: 'mobile_money', label: 'Mobile Money', description: 'Pay directly with an enabled MoMo network', icon: Smartphone },
    { value: 'card', label: 'Card', description: 'Visa or Mastercard through Paystack', icon: CreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', description: 'Order activates after admin verification', icon: Landmark },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Secure checkout</p>
            <h1 className="mt-2 text-3xl font-extrabold text-black">Complete your order</h1>
            <p className="mt-2 text-sm text-gray-500">Guest checkout is available. Digital purchases automatically receive a secure customer account.</p>
          </div>
          {!signedIn && (
            <button type="button" onClick={() => openCustomerAuth('login')} className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold hover:border-black">
              Sign in for faster checkout
            </button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2"><User size={18} /><h2 className="font-extrabold">Contact details</h2></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} disabled={signedIn} placeholder="Full name" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-50" />
                <input value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} disabled={signedIn} placeholder="Phone / WhatsApp" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-50" />
                <input value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} disabled={signedIn} placeholder="Email address" type="email" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-gray-50 sm:col-span-2" />
                <input value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} placeholder="Billing address (optional, saved when signed in)" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black sm:col-span-2" />
              </div>
              {hasDigitalItems && !signedIn && <p className="mt-3 rounded-2xl bg-[#fcf7df] px-4 py-3 text-xs leading-relaxed text-[#735d00]">After payment, we will email you a secure link to create your password and open your digital library.</p>}
            </section>

            {!digitalOnly && (
              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 font-extrabold">Fulfillment</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {fulfillmentOptions.map((option) => {
                    const Icon = option.icon;
                    return <button key={option.value} type="button" onClick={() => { setFulfillment(option.value); setZone(''); }} className={`rounded-2xl border-2 p-4 text-left ${fulfillment === option.value ? 'border-black bg-black text-white' : 'border-gray-100 hover:border-gray-300'}`}><Icon size={18} className={fulfillment === option.value ? 'text-[#FDC700]' : 'text-gray-400'} /><p className="mt-2 text-sm font-extrabold">{option.label}</p><p className={`mt-1 text-xs ${fulfillment === option.value ? 'text-gray-300' : 'text-gray-400'}`}>{option.description}</p></button>;
                  })}
                </div>
                {fulfillment === 'delivery' && <select value={zone} onChange={(event) => setZone(event.target.value)} className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"><option value="">Select delivery zone</option>{zones?.map((item) => <option key={item._id} value={item._id}>{item.name} - {formatMoney(item.fee)}</option>)}</select>}
                {fulfillment !== 'pickup' && <textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder={fulfillment === 'arranged-delivery' ? 'Optional delivery note or preferred rider' : 'Full delivery address'} rows={3} className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />}
                {signedIn && address && <label className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-600"><input type="checkbox" checked={saveAddr} onChange={(event) => setSaveAddr(event.target.checked)} /> Save this address to my profile</label>}
              </section>
            )}

            {!freeOnlyDigital && (
              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 font-extrabold">Payment method</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    return <button key={option.value} type="button" onClick={() => setPaymentMethod(option.value)} className={`rounded-2xl border-2 p-4 text-left ${paymentMethod === option.value ? 'border-[#FDC700] bg-[#fffbea]' : 'border-gray-100 hover:border-gray-300'}`}><Icon size={19} className={paymentMethod === option.value ? 'text-[#9a7a00]' : 'text-gray-400'} /><p className="mt-2 text-sm font-extrabold">{option.label}</p><p className="mt-1 text-xs text-gray-500">{option.description}</p></button>;
                  })}
                </div>
                {paymentMethod === 'bank_transfer' && <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700">Your order will be reserved as awaiting verification. Bank details and your payment reference will appear on the next screen.</p>}
              </section>
            )}
          </div>

          <aside>
            <div className="sticky top-20 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-extrabold">Order summary</h2>
              <div className="mt-4 max-h-52 space-y-3 overflow-y-auto">
                {cart.map((item) => <div key={item.key} className="flex items-center gap-3"><div className="h-11 w-11 overflow-hidden rounded-xl bg-gray-100">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{item.name}</p><p className="text-xs text-gray-400">x{item.qty}{item.variant ? ` - ${item.variant}` : ''}</p></div><p className="text-xs font-extrabold">{item.isDigital && item.digitalAccessKind !== 'paid' ? (item.digitalAccessKind === 'free' ? 'Free' : 'Trial') : formatMoney(item.price * item.qty)}</p></div>)}
              </div>

              <div className="mt-5 rounded-2xl bg-[#fcfbf7] p-3">
                <div className="flex gap-2"><div className="relative flex-1"><Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setAppliedCoupon(null); }} placeholder="Coupon code" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold uppercase outline-none focus:border-black" /></div><button type="button" onClick={applyCoupon} disabled={couponLoading} className="rounded-xl bg-black px-4 text-xs font-extrabold text-white disabled:opacity-50">{couponLoading ? '...' : 'Apply'}</button></div>
                {couponMessage && <p className={`mt-2 text-xs font-bold ${appliedCoupon ? 'text-green-600' : 'text-red-500'}`}>{couponMessage}</p>}
              </div>

              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold">{formatMoney(displaySubtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span className="font-bold">{digitalOnly ? 'Digital' : formatMoney(displayDelivery)}</span></div>
                {displayDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span><span className="font-bold">-{formatMoney(displayDiscount)}</span></div>}
                <div className="flex justify-between border-t border-gray-100 pt-3 text-lg font-extrabold"><span>{paymentMethod === 'bank_transfer' ? 'Amount due' : 'Pay now'}</span><span>{formatMoney(displayTotal)}</span></div>
                {isConvertedDisplay && <div className="flex justify-between text-xs text-gray-400"><span>Base charge</span><span>{formatBaseMoney(displayTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
              </div>

              {error && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}
              <button type="button" onClick={handlePayment} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FDC700] py-3.5 text-sm font-extrabold text-black hover:bg-yellow-300 disabled:opacity-50">{loading && <Loader2 size={17} className="animate-spin" />}{loading ? 'Preparing checkout...' : freeOnlyDigital ? 'Get Free Access' : paymentMethod === 'bank_transfer' ? 'Create Bank Transfer Order' : `Pay ${formatMoney(displayTotal)}`}</button>
              <p className="mt-3 text-center text-xs leading-relaxed text-gray-400">{ghanaCheckoutNote}</p>
            </div>
          </aside>
        </div>
      </div>
      {showCustomerModal && <CustomerModal initialMode={customerModalMode} onClose={() => setShowCustomerModal(false)} />}
    </div>
  );
}
