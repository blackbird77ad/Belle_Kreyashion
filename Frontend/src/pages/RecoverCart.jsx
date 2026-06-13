import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, ShoppingBag } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';

export default function RecoverCart() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { restoreCart } = useCart();
  const token = params.get('token') || '';
  const [error, setError] = useState(token ? '' : 'This recovery link is missing its secure token.');

  useEffect(() => {
    if (!token) return;
    api.get(`/api/orders/recover/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        restoreCart(data.items || []);
        try { localStorage.setItem('bk_checkout_contact', JSON.stringify(data.customer || {})); } catch { /* Storage can be unavailable in private browsing. */ }
        navigate('/shop/checkout', { replace: true });
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'This saved-cart link could not be restored.'));
  }, [navigate, restoreCart, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 pt-16">
      <div className="w-full max-w-md rounded-[30px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        {error ? <AlertCircle size={42} className="mx-auto text-amber-500" /> : <Loader2 size={42} className="mx-auto animate-spin text-[#FDC700]" />}
        <h1 className="mt-5 text-2xl font-extrabold">{error ? 'Cart link unavailable' : 'Restoring your cart'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">{error || 'We are loading your saved items and the latest product availability.'}</p>
        {error && <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white"><ShoppingBag size={16} /> Return to Shop</Link>}
      </div>
    </div>
  );
}
