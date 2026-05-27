import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, MapPin, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { api, useFetch } from '../hooks/useApi';
import { getAttributionSnapshot } from '../utils/attribution';

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function validatePhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Phone number is missing';
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number contains invalid characters';

  if (cleaned.startsWith('0')) {
    if (cleaned.length !== 10) return 'Ghana number must be 10 digits (e.g. 0241234567)';
    const prefix = cleaned.slice(0, 3);
    const validPrefixes = ['020', '023', '024', '025', '026', '027', '028', '029', '050', '053', '054', '055', '056', '057', '059'];
    if (!validPrefixes.includes(prefix)) return `"${prefix}" is not a recognised Ghana network. Please check the number.`;
    return null;
  }

  if (cleaned.startsWith('+233') || cleaned.startsWith('233')) {
    const digits = cleaned.replace(/^\+/, '');
    if (digits.length !== 12) return 'Ghana number with country code must be 12 digits';
    return null;
  }

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (digits.length < 7 || digits.length > 15) return 'International number looks incorrect. Please check it.';
    return null;
  }

  if (cleaned.length >= 7 && cleaned.length <= 15) return 'For international numbers please include the + country code';
  return 'Please enter a valid phone number';
}

export default function Checkout() {
  const { cart, subtotal, clearCart } = useCart();
  const { customer, saveAddress } = useCustomer();
  const navigate = useNavigate();
  const { data: zones } = useFetch('/api/delivery/public');

  const [fulfillment, setFulfillment] = useState('delivery');
  const [zone, setZone] = useState('');
  const [address, setAddress] = useState(customer?.savedAddress || '');
  const [saveAddr, setSaveAddr] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasDigitalItems = cart.some((item) => item.isDigital);
  const hasPhysicalItems = cart.some((item) => !item.isDigital);
  const hasTrialItems = cart.some((item) => item.isDigital && item.digitalAccessKind === 'trial');
  const freeOnlyDigital = hasDigitalItems && !hasPhysicalItems && cart.every((item) => item.digitalAccessKind === 'free');
  const digitalOnly = hasDigitalItems && !hasPhysicalItems;
  const selectedZone = digitalOnly ? null : zones?.find((item) => item._id === zone);
  const deliveryFee = digitalOnly ? 0 : fulfillment === 'delivery' ? (selectedZone?.fee || 0) : 0;
  const total = subtotal + deliveryFee;
  const trialSetupCharge = hasTrialItems && total === 0 ? 0.1 : 0;
  const payableNow = total + trialSetupCharge;
  const digitalDeliveryLabel = freeOnlyDigital ? 'Instant after free claim' : hasTrialItems ? 'Instant after trial start' : 'Instant after payment';

  useEffect(() => {
    if (!customer) {
      navigate('/');
      return;
    }

    const isPaying = !!sessionStorage.getItem('bk_pending_order');
    if (!isPaying && cart.length === 0) navigate('/shop');
  }, []);

  const isPaying = !!sessionStorage.getItem('bk_pending_order');
  if (!customer) return null;
  if (!isPaying && cart.length === 0) return null;

  const validate = () => {
    const phoneErr = validatePhone(customer.phone || '');
    if (phoneErr) return `Your saved phone number looks incorrect (${phoneErr}). Please update it.`;
    if (digitalOnly) return null;
    if (fulfillment === 'delivery' && !zone) return 'Please select a delivery zone';
    if (fulfillment !== 'pickup' && !address.trim()) return 'Please enter your address';
    return null;
  };

  const handlePayment = async () => {
    const err = validate();
    if (err) return setError(err);

    setError('');
    setLoading(true);

    const checkoutAttribution = getAttributionSnapshot();
    const itemAttributions = cart.map((item) => item.sourceAttribution || checkoutAttribution);
    const sourcePages = [...new Set(
      itemAttributions
        .map((item) => item?.sourcePath || item?.sourcePage || '')
        .filter(Boolean)
    )];
    const primaryAttribution = itemAttributions.find((item) => item?.utmCampaign || item?.utmSource) || itemAttributions[0] || checkoutAttribution;

    const orderData = {
      customer: {
        ...customer,
        address: digitalOnly ? 'DIGITAL ACCESS' : fulfillment === 'pickup' ? 'PICKUP' : address.trim(),
      },
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        isWholesale: item.isWholesale,
        isDigital: !!item.isDigital,
        digitalAccessKind: item.digitalAccessKind || null,
        trialDays: item.digitalAccessKind === 'trial' ? Number(item.freeTrialDays || 7) : null,
        trialChargeAmount: item.digitalAccessKind === 'trial' ? Number(item.trialChargeAmount || 0) : null,
        variant: item.variant,
        sourceAttribution: item.sourceAttribution || checkoutAttribution,
      })),
      subtotal,
      fulfillment: digitalOnly ? 'digital' : fulfillment,
      deliveryZone: digitalOnly
        ? 'Digital Delivery'
        : fulfillment === 'pickup'
          ? 'Pickup'
          : fulfillment === 'international'
            ? 'International'
        : (selectedZone?.name || ''),
      deliveryFee: digitalOnly ? 0 : deliveryFee,
      total,
      orderType: digitalOnly ? 'digital' : fulfillment === 'international' ? 'international' : 'standard',
      paymentPurpose: hasTrialItems && total === 0 ? 'trial_setup' : 'purchase',
      sourceAttribution: primaryAttribution,
      sourcePages,
    };

    if (freeOnlyDigital) {
      try {
        const { data } = await api.post('/api/orders/free-digital', { orderData });
        sessionStorage.setItem('bk_last_order', JSON.stringify({
          order: data.order,
          whatsappUrl: data.whatsappUrl,
          callUrl: data.callUrl,
        }));
        clearCart();
        navigate('/order-confirmed');
      } catch (freeErr) {
        setError(freeErr.response?.data?.message || 'Could not unlock the free digital product right now.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!window.PaystackPop) {
      setError('Payment system not ready. Please refresh the page.');
      setLoading(false);
      return;
    }

    const ref = `BK-${Date.now()}`;

    function onPaymentSuccess(response) {
      if (!digitalOnly && saveAddr && address.trim()) saveAddress(address.trim());
      sessionStorage.setItem('bk_pending_order', JSON.stringify({
        paymentRef: response.reference,
        orderData,
      }));
      clearCart();
      navigate('/order-confirmed');
    }

    function onPaymentClose() {
      setLoading(false);
    }

    try {
      const phoneDigits = customer.phone.replace(/[^0-9]/g, '');
      const paystackEmail = customer.email?.trim() || `${phoneDigits}@bellekreyashon.com`;
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: paystackEmail,
        amount: Math.round(payableNow * 100),
        currency: 'GHS',
        ref,
        channels: hasTrialItems ? ['card'] : undefined,
        callback: onPaymentSuccess,
        onClose: onPaymentClose,
      });

      setLoading(false);
      handler.openIframe();
    } catch (setupError) {
      console.error('Paystack setup error:', setupError.message);
      setError('Payment could not start. Please refresh and try again.');
      setLoading(false);
    }
  };

  const FULFILLMENT_OPTIONS = [
    { value: 'pickup', label: 'Pickup', desc: 'Collect from Osu, Accra', icon: <Package size={18} />, fee: 'Free' },
    { value: 'delivery', label: 'Delivery', desc: 'Delivered to you', icon: <MapPin size={18} />, fee: 'By zone' },
    { value: 'international', label: 'International', desc: 'Ship anywhere', icon: <Globe size={18} />, fee: 'Quoted after' },
  ];

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-8">Checkout</h1>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h2 className="font-extrabold mb-3">Your Details</h2>
              <div className="flex gap-3 flex-wrap">
                <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm font-bold">{customer.name}</div>
                <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm font-bold">{customer.phone}</div>
                {customer.email && <div className="px-3 py-2 bg-gray-50 rounded-xl text-sm font-bold">{customer.email}</div>}
              </div>
              {validatePhone(customer.phone || '') && (
                <p className="text-xs text-red-500 font-bold mt-2">
                  Your saved phone number may be incorrect. Orders and delivery updates are sent to this number.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              {digitalOnly ? (
                <>
                  <h2 className="font-extrabold mb-4">Digital Delivery</h2>
                  <div className="bg-[#fcfbf7] rounded-2xl p-4 border border-[#FDC700]/30">
                    <p className="font-bold text-sm text-black mb-1">No shipping details needed</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      This checkout contains only digital products. Your files will unlock in your secure digital library immediately after checkout confirmation.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-extrabold mb-4">How do you want to receive your order?</h2>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {FULFILLMENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFulfillment(option.value);
                          setZone('');
                          setAddress('');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${fulfillment === option.value ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        <div className={`mb-1.5 ${fulfillment === option.value ? 'text-[#FDC700]' : 'text-gray-400'}`}>{option.icon}</div>
                        <div className="font-extrabold text-xs mb-0.5">{option.label}</div>
                        <div className={`text-xs ${fulfillment === option.value ? 'text-gray-300' : 'text-gray-400'}`}>{option.desc}</div>
                        <div className={`text-xs font-bold mt-1 ${fulfillment === option.value ? 'text-[#FDC700]' : 'text-gray-500'}`}>{option.fee}</div>
                      </button>
                    ))}
                  </div>

                  {fulfillment === 'pickup' && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <p className="font-bold text-green-800 text-sm mb-1">Pickup Location</p>
                      <p className="text-green-700 text-xs leading-relaxed">
                        Osu, Accra, Ghana. After payment, contact us on WhatsApp to confirm your pickup time and exact address.
                      </p>
                    </div>
                  )}

                  {fulfillment === 'delivery' && (
                    <div className="space-y-3">
                      <select
                        value={zone}
                        onChange={(event) => setZone(event.target.value)}
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black"
                      >
                        <option value="">Select delivery zone *</option>
                        {zones?.map((item) => (
                          <option key={item._id} value={item._id}>{item.name} - GHS {item.fee}</option>
                        ))}
                      </select>
                      {customer?.savedAddress && (
                        <div className="flex gap-2 items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-0.5">Saved address</p>
                            <p className="text-sm font-bold">{customer.savedAddress}</p>
                          </div>
                          <button onClick={() => setAddress(customer.savedAddress)} className="text-xs font-bold text-[#FDC700] bg-black px-3 py-1.5 rounded-xl">Use</button>
                        </div>
                      )}
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3 top-3.5 text-gray-400" />
                        <textarea
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          rows={2}
                          placeholder="House number, street, area, city *"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black resize-none"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input type="checkbox" checked={saveAddr} onChange={(event) => setSaveAddr(event.target.checked)} className="w-4 h-4 accent-black" />
                        Save this address for next time
                      </label>
                    </div>
                  )}

                  {fulfillment === 'international' && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="font-bold text-blue-800 text-sm mb-1">International Shipping</p>
                        <p className="text-blue-700 text-xs leading-relaxed">
                          Pay for your items now. We will contact you after payment to confirm your preferred courier - DHL, FedEx or other. Shipping cost is paid directly to the courier.
                        </p>
                      </div>
                      <div className="relative">
                        <Globe size={15} className="absolute left-3 top-3.5 text-gray-400" />
                        <textarea
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          rows={2}
                          placeholder="Full international address including country *"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black resize-none"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input type="checkbox" checked={saveAddr} onChange={(event) => setSaveAddr(event.target.checked)} className="w-4 h-4 accent-black" />
                        Save this address for next time
                      </label>
                    </div>
                  )}
                </>
              )}

              {!digitalOnly && hasDigitalItems && (
                <div className="mt-4 rounded-xl border border-[#FDC700]/30 bg-[#fcfbf7] px-4 py-3">
                  <p className="text-xs font-bold text-black">Digital products in this cart</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your digital items will still unlock in your secure library after payment, alongside delivery for your physical order.
                  </p>
                </div>
              )}

              {hasTrialItems && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-bold text-blue-800">Free trial card setup</p>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    Trial digital products need a reusable card authorization now so we can bill the saved amount after the trial ends. {trialSetupCharge > 0 ? `A temporary GHS ${trialSetupCharge.toFixed(2)} card setup charge is used to securely save the card for this trial-only checkout.` : 'Because you already have a payable amount in this checkout, the same card payment can be used for the trial authorization too.'}
                  </p>
                </div>
              )}
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100">{error}</div>}
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 sticky top-20">
              <h2 className="font-extrabold mb-4">Order Summary</h2>
              <div className="flex flex-col gap-2 mb-4 max-h-44 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" onError={(event) => { event.target.style.display = 'none'; }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        x{item.qty}{item.isDigital ? ` - ${item.digitalAccessKind === 'free' ? 'Free digital access' : item.digitalAccessKind === 'trial' ? `${item.freeTrialDays || 7}-day trial` : 'Digital access'}` : ''}
                      </p>
                    </div>
                    <p className="text-xs font-extrabold shrink-0">
                      {item.isDigital && item.digitalAccessKind === 'free'
                        ? 'Free'
                        : item.isDigital && item.digitalAccessKind === 'trial'
                          ? 'GHS 0 now'
                          : `GHS ${(item.price * item.qty).toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold">GHS {subtotal.toLocaleString()}</span>
                </div>
                {trialSetupCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Card setup for free trial</span>
                    <span className="font-bold">GHS {trialSetupCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{digitalOnly ? 'Access Delivery' : 'Delivery'}</span>
                  <span className="font-bold">
                    {digitalOnly ? digitalDeliveryLabel : fulfillment === 'pickup' ? 'Free' : fulfillment === 'international' ? 'Quoted after' : `GHS ${deliveryFee}`}
                  </span>
                </div>
                {(digitalOnly || fulfillment !== 'international') && (
                  <div className="flex justify-between font-extrabold text-base border-t border-gray-100 pt-2 mt-1">
                    <span>Total</span>
                    <span>GHS {payableNow.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#FDC700] text-black font-extrabold text-sm hover:bg-yellow-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : freeOnlyDigital ? 'Get Free Access' : hasTrialItems && total === 0 ? `Start Trial With GHS ${trialSetupCharge.toFixed(2)} Card Setup` : `Pay GHS ${payableNow.toLocaleString()}`}
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secured by Paystack - {hasTrialItems ? 'Card required for trial authorization' : 'Card and Mobile Money'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
