import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import SEO from '../components/SEO';
import { useCustomer } from '../context/CustomerContext';
import { api } from '../hooks/useApi';

export default function CustomerVerify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { setCustomer } = useCustomer();
  const [state, setState] = useState(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? 'Confirming your email address...' : 'This verification link is missing a token.');

  useEffect(() => {
    if (!token) return;

    api.post('/api/customers/verify', { token })
      .then(({ data }) => {
        if (data.customerToken) {
          setCustomer({
            ...data.customer,
            accessToken: data.customerToken,
          });
        }
        setState('success');
        setMessage(data.message || 'Your email address has been confirmed.');
      })
      .catch((error) => {
        setState('error');
        setMessage(error.response?.data?.message || 'This email confirmation link is invalid or has expired.');
      });
  }, [setCustomer, token]);

  return (
    <div className="min-h-screen bg-[#fcfbf7] px-4 pb-16 pt-24">
      <SEO title="Verify Email" description="Confirm your Belle Kreyashon customer email address." noindex url="/account/verify" />

      <div className="mx-auto max-w-lg rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          state === 'success'
            ? 'bg-emerald-50 text-emerald-600'
            : state === 'error'
              ? 'bg-red-50 text-red-500'
              : 'bg-[#fcf7df] text-[#9a7a00]'
        }`}>
          {state === 'success' ? <CheckCircle2 size={30} /> : state === 'error' ? <AlertCircle size={30} /> : <Loader2 size={30} className="animate-spin" />}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Customer Account</p>
          <h1 className="mt-2 text-3xl font-extrabold text-black">Email Verification</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-500">{message}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {state === 'success' && (
            <>
              <Link to="/track" className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900">
                Open My Dashboard
              </Link>
              <Link to="/digital-library" className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black">
                Open Digital Library
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <Link to="/track" className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900">
                Sign In Again
              </Link>
              <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black">
                <Mail size={15} />
                Back Home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
