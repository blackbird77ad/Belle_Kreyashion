import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Download, Loader2, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { generateInvoice } from '../utils/generateInvoice';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { WHATSAPP } from '../data/contact';

export default function OrderConfirmation() {
  const [state, setState] = useState('verifying');
  const [order, setOrder] = useState(null);
  const [waUrl, setWaUrl] = useState('');
  const [callUrl, setCallUrl] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const { customer } = useCustomer();
  const { clearCart } = useCart();

  useEffect(() => {
    const pending = sessionStorage.getItem('bk_pending_order');
    const existing = sessionStorage.getItem('bk_last_order');

    if (pending) {
      const { paymentRef, orderData } = JSON.parse(pending);
      sessionStorage.removeItem('bk_pending_order');

      api.post('/api/orders/verify', { paymentRef, orderData })
        .then((response) => {
          const payload = {
            order: response.data.order,
            whatsappUrl: response.data.whatsappUrl,
            callUrl: response.data.callUrl,
          };

          sessionStorage.setItem('bk_last_order', JSON.stringify(payload));
          clearCart();
          setOrder(response.data.order);
          setWaUrl(response.data.whatsappUrl);
          setCallUrl(response.data.callUrl);
          setState('success');

          if (response.data.order?.fulfillment !== 'digital') {
            setTimeout(() => window.open(response.data.whatsappUrl, '_blank'), 1000);
          }
        })
        .catch(() => {
          const ref = JSON.parse(pending || '{}').paymentRef;
          clearCart();
          setErrMsg(`Payment received. Ref: ${ref}. Contact us to confirm your order.`);
          setState('error');
        });
    } else if (existing) {
      const payload = JSON.parse(existing);
      clearCart();
      setOrder(payload.order);
      setWaUrl(payload.whatsappUrl);
      setCallUrl(payload.callUrl);
      setState('success');
    } else {
      setState('error');
      setErrMsg('No order found.');
    }
  }, []);

  if (state === 'verifying') {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#FDC700]" />
          <p className="font-extrabold text-lg">Confirming your order...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <AlertCircle size={40} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="font-extrabold text-lg mb-2">Payment Received</h2>
          <p className="text-gray-500 text-sm mb-6">{errMsg || 'Your payment was received. Please contact us to confirm your order.'}</p>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white font-extrabold rounded-2xl hover:bg-green-600 mb-3"
          >
            <MessageCircle size={18} /> Contact Us on WhatsApp
          </a>
          <Link to="/shop" className="text-sm text-gray-400 hover:text-black underline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  const hasDigitalItems = !!order?.items?.some((item) => item.isDigital);
  const digitalOnly = order?.fulfillment === 'digital';
  const hasTrialItems = !!order?.items?.some((item) => item.isDigital && item.digitalAccessKind === 'trial');
  const hasFreeDigitalItems = !!order?.items?.some((item) => item.isDigital && item.digitalAccessKind === 'free');
  const amountPaidNow = order?.paymentPurpose === 'trial_setup'
    ? Number(order?.paystackChargedAmount || 0)
    : Number(order?.total || 0);
  const digitalDeliveryLabel = order?.paymentPurpose === 'free_claim'
    ? 'Instant after free claim'
    : order?.paymentPurpose === 'trial_setup'
      ? 'Instant after trial setup'
      : 'Instant after payment';

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Order Confirmed!</h1>
          <p className="text-gray-400 text-sm">
            Thank you{customer?.name ? `, ${customer.name}` : ''}. {order?.paymentPurpose === 'free_claim' ? 'Your digital access is ready.' : order?.paymentPurpose === 'trial_setup' ? 'Your trial setup was completed.' : 'Your payment was received.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-gray-400">Order ID</p>
              <p className="font-extrabold text-[#FDC700] text-lg">{order?.orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{order?.paymentPurpose === 'trial_setup' ? 'Card Setup Taken Now' : 'Total Paid'}</p>
              <p className="font-extrabold text-lg">GHS {amountPaidNow?.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            {order?.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">
                  {item.name}{item.variant ? ` (${item.variant})` : ''} x {item.qty}{item.isDigital ? ` - ${item.digitalAccessKind === 'free' ? 'Free Digital' : item.digitalAccessKind === 'trial' ? 'Trial Digital' : 'Digital'}` : ''}
                </span>
                <span className="font-bold">
                  {item.isDigital && item.digitalAccessKind === 'free'
                    ? 'Free'
                    : item.isDigital && item.digitalAccessKind === 'trial'
                      ? `Trial now${item.trialChargeAmount ? `, then GHS ${Number(item.trialChargeAmount).toLocaleString()}` : ''}`
                      : `GHS ${(item.price * item.qty).toLocaleString()}`}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 mt-1">
              <span className="text-gray-500">
                {digitalOnly ? 'Access Delivery' : `Delivery (${order?.deliveryZone})`}
              </span>
              <span className="font-bold">
                {digitalOnly ? digitalDeliveryLabel : `GHS ${order?.deliveryFee}`}
              </span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 capitalize">
            <span className="font-bold">Fulfillment:</span> {order?.fulfillment}
            {order?.customer?.address && order.customer.address !== 'PICKUP' && order.customer.address !== 'DIGITAL ACCESS' && (
              <div className="mt-1">{order.customer.address}</div>
            )}
          </div>
        </div>

        {hasDigitalItems && (
          <div className="bg-[#fcfbf7] border border-[#FDC700]/30 rounded-2xl p-5 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-[#FDC700] text-black flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-extrabold mb-1">Digital Access Is Ready</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {hasTrialItems
                    ? 'Your trial digital products are already unlocked in your secure library. We will attempt the saved card charge automatically when the trial ends.'
                    : hasFreeDigitalItems
                      ? 'Your free digital products are protected and available in your secure digital library.'
                      : 'Your paid digital products are protected and available in your secure digital library.'}
                </p>
                <Link
                  to="/digital-library"
                  className="mt-3 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900"
                >
                  Open Digital Library
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-black text-white rounded-2xl p-5 mb-5">
          <p className="font-extrabold mb-2">What happens next?</p>
          <ul className="text-sm text-gray-300 space-y-2">
            {digitalOnly && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> Open your secure digital library from the button above</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> Use the same customer session used for checkout to access your files</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> Each file is delivered through protected access links and stays customer-only</li>
                {hasTrialItems && <li className="flex gap-2"><span className="text-[#FDC700]">4.</span> Your saved card authorization will be charged automatically when the free trial ends</li>}
              </>
            )}
            {!digitalOnly && order?.fulfillment === 'pickup' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> Contact us on WhatsApp to confirm your pickup time</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> We will share the exact pickup address</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> Come collect your order from Osu, Accra</li>
              </>
            )}
            {!digitalOnly && order?.fulfillment === 'delivery' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> We will confirm your order via WhatsApp</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> Your order will be dispatched within 1 to 2 days</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> We will notify you when it is on its way</li>
              </>
            )}
            {!digitalOnly && order?.fulfillment === 'international' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> We will contact you to confirm your courier preference</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> You pay shipping directly to the courier</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> We dispatch once shipping is arranged</li>
              </>
            )}
            {!digitalOnly && hasDigitalItems && (
              <li className="flex gap-2"><span className="text-[#FDC700]">4.</span> Your digital items are also waiting in your secure digital library</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-500 text-white font-extrabold rounded-2xl hover:bg-green-600 transition-all"
            >
              <MessageCircle size={18} /> Notify Belle Kreyashon via WhatsApp
            </a>
          )}
          {callUrl && (
            <a
              href={callUrl}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-100 text-black font-extrabold rounded-2xl hover:bg-gray-200 transition-all"
            >
              <Phone size={18} /> Call Us
            </a>
          )}
          <button
            onClick={() => order && generateInvoice(order)}
            className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-gray-200 text-black font-extrabold rounded-2xl hover:border-black transition-all text-sm"
          >
            <Download size={16} /> Download Invoice
          </button>
          <Link
            to="/orders"
            className="flex items-center justify-center w-full py-3.5 border-2 border-gray-200 text-black font-extrabold rounded-2xl hover:border-black transition-all text-sm"
          >
            View My Orders
          </Link>
          <Link to="/shop" className="text-center text-sm text-gray-400 hover:text-black transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
