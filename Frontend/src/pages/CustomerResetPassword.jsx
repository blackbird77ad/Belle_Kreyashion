import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { useCustomer } from '../context/CustomerContext';
import { api, getApiErrorMessage } from '../hooks/useApi';

export default function CustomerResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { setCustomer } = useCustomer();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('This password reset link is missing a token.');
      return;
    }
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/customers/password-reset/reset', {
        token,
        password,
      });
      if (data.customerToken) {
        setCustomer({
          ...data.customer,
          accessToken: data.customerToken,
        });
      }
      setSuccess(data.message || 'Your password has been updated and you are now signed in.');
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Could not reset your password right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] px-4 pb-16 pt-24">
      <SEO title="Reset Password" description="Reset your Belle Kreyashon customer password." noindex url="/account/reset-password" />

      <div className="mx-auto max-w-lg rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${success ? 'bg-emerald-50 text-emerald-600' : error ? 'bg-red-50 text-red-500' : 'bg-[#fcf7df] text-[#9a7a00]'}`}>
          {loading ? <Loader2 size={30} className="animate-spin" /> : success ? <CheckCircle2 size={30} /> : error ? <AlertCircle size={30} /> : <Lock size={30} />}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Customer Account</p>
          <h1 className="mt-2 text-3xl font-extrabold text-black">Choose A New Password</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-500">
            Use a password you will remember easily when signing in with either your email address or your phone number.
          </p>
        </div>

        {!success ? (
          <form onSubmit={submit} className="mt-8 space-y-3">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                type="password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                type="password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
              />
            </div>

            {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-extrabold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</p>
            <Link to="/track" className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-gray-900">
              Open My Dashboard
            </Link>
            <Link to="/digital-library" className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black">
              Open Digital Library
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
