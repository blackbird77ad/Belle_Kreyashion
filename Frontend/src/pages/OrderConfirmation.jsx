import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MessageCircle, Phone, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';

export default function OrderConfirmation() {
  const [state,   setState]   = useState('verifying'); // verifying | success | error
  const [order,   setOrder]   = useState(null);
  const [waUrl,   setWaUrl]   = useState('');
  const [callUrl, setCallUrl] = useState('');
  const [errMsg,  setErrMsg]  = useState('');
  const { customer } = useCustomer();
  const { clearCart } = useCart();

  useEffect(() => {
    const pending = sessionStorage.getItem('bk_pending_order');
    const existing = sessionStorage.getItem('bk_last_order');

    if (pending) {
      // Fresh payment — verify now
      const { paymentRef, orderData } = JSON.parse(pending);
      sessionStorage.removeItem('bk_pending_order');

      api.post('/api/orders/verify', { paymentRef, orderData })
        .then(res => {
          const d = { order: res.data.order, whatsappUrl: res.data.whatsappUrl, callUrl: res.data.callUrl };
          sessionStorage.setItem('bk_last_order', JSON.stringify(d));
          clearCart();
          setOrder(res.data.order);
          setWaUrl(res.data.whatsappUrl);
          setCallUrl(res.data.callUrl);
          setState('success');
          // Auto-open WhatsApp after short delay
          setTimeout(() => window.open(res.data.whatsappUrl, '_blank'), 1000);
        })
        .catch(err => {
          const ref = JSON.parse(pending || '{}').paymentRef;
          setErrMsg(`Payment received. Ref: ${ref}. Contact us to confirm your order.`);
          setState('error');
        });
    } else if (existing) {
      // Returning to page
      const d = JSON.parse(existing);
      setOrder(d.order);
      setWaUrl(d.whatsappUrl);
      setCallUrl(d.callUrl);
      setState('success');
    } else {
      setState('error');
      setErrMsg('No order found.');
    }
  }, []);

  if (state === 'verifying') return (
    <div className="pt-16 min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#FDC700]" />
        <p className="font-extrabold text-lg">Confirming your order...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  );

  if (state === 'error') return (
    <div className="pt-16 min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
        <AlertCircle size={40} className="mx-auto mb-4 text-yellow-500" />
        <h2 className="font-extrabold text-lg mb-2">Payment Received</h2>
        <p className="text-gray-500 text-sm mb-6">{errMsg || 'Your payment was received. Please contact us to confirm your order.'}</p>
        <a href={`https://wa.me/233548894600`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white font-extrabold rounded-2xl hover:bg-green-600 mb-3">
          <MessageCircle size={18} /> Contact Us on WhatsApp
        </a>
        <Link to="/shop" className="text-sm text-gray-400 hover:text-black underline">Continue Shopping</Link>
      </div>
    </div>
  );

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Order Confirmed!</h1>
          <p className="text-gray-400 text-sm">Thank you{customer?.name ? `, ${customer.name}` : ''}. Your payment was received.</p>
        </div>

        {/* Order summary card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-gray-400">Order ID</p>
              <p className="font-extrabold text-[#FDC700] text-lg">{order?.orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Paid</p>
              <p className="font-extrabold text-lg">GHS {order?.total?.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            {order?.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.qty}</span>
                <span className="font-bold">GHS {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 mt-1">
              <span className="text-gray-500">Delivery ({order?.deliveryZone})</span>
              <span className="font-bold">GHS {order?.deliveryFee}</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 capitalize">
            <span className="font-bold">Fulfillment:</span> {order?.fulfillment}
            {order?.customer?.address && order.customer.address !== 'PICKUP' && (
              <div className="mt-1">📍 {order.customer.address}</div>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-black text-white rounded-2xl p-5 mb-5">
          <p className="font-extrabold mb-2">What happens next?</p>
          <ul className="text-sm text-gray-300 space-y-2">
            {order?.fulfillment === 'pickup' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> Contact us on WhatsApp to confirm your pickup time</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> We will share the exact pickup address</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> Come collect your order from Osu, Accra</li>
              </>
            )}
            {order?.fulfillment === 'delivery' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> We will confirm your order via WhatsApp</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> Your order will be dispatched within 1–2 days</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> We will notify you when it is on its way</li>
              </>
            )}
            {order?.fulfillment === 'international' && (
              <>
                <li className="flex gap-2"><span className="text-[#FDC700]">1.</span> We will contact you to confirm your courier preference</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">2.</span> You pay shipping directly to the courier</li>
                <li className="flex gap-2"><span className="text-[#FDC700]">3.</span> We dispatch once shipping is arranged</li>
              </>
            )}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-500 text-white font-extrabold rounded-2xl hover:bg-green-600 transition-all">
              <MessageCircle size={18} /> Notify Anna via WhatsApp
            </a>
          )}
          {callUrl && (
            <a href={callUrl}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-100 text-black font-extrabold rounded-2xl hover:bg-gray-200 transition-all">
              <Phone size={18} /> Call Us
            </a>
          )}
          <Link to="/orders"
            className="flex items-center justify-center w-full py-3.5 border-2 border-gray-200 text-black font-extrabold rounded-2xl hover:border-black transition-all text-sm">
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