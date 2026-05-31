import { useState } from 'react';
import { X, User, Phone, Mail, Lock } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCustomer } from '../context/CustomerContext';

function validatePhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');

  if (!cleaned) return 'Please enter your phone number';
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number can only contain digits';

  if (cleaned.startsWith('0')) {
    if (cleaned.length !== 10) return 'Ghana numbers must be 10 digits (e.g. 0241234567)';
    const prefix = cleaned.slice(0, 3);
    const validGhanaPrefixes = ['020', '023', '024', '025', '026', '027', '028', '029', '050', '053', '054', '055', '056', '057', '059'];
    if (!validGhanaPrefixes.includes(prefix)) return `"${prefix}" is not a valid Ghana network prefix`;
    return null;
  }

  if (cleaned.startsWith('+233') || cleaned.startsWith('233')) {
    const digits = cleaned.replace(/^\+/, '');
    if (digits.length !== 12) return 'Ghana number with country code must be 12 digits (e.g. +233241234567)';
    return null;
  }

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (digits.length < 7 || digits.length > 15) return 'International number must be 7-15 digits after the + sign';
    return null;
  }

  if (cleaned.length >= 7 && cleaned.length <= 15) {
    return 'For international numbers please include the + country code';
  }

  return 'Please enter a valid phone number';
}

function normalizePhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
}

function validateEmail(raw) {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return 'Please enter your email address';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return 'Please enter a valid email address';
  return null;
}

const ACCOUNT_COPY = {
  signup: {
    title: 'Create your customer account',
    subtitle: 'Use your email for reset links, welcome messages, receipts, and order updates.',
    button: 'Create Account',
  },
  login: {
    title: 'Sign in as customer',
    subtitle: 'Use the same account to manage orders, digital products, and bookings more smoothly.',
    button: 'Sign In',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: 'Enter the email linked to your account and we will send you a reset link.',
    button: 'Send Reset Link',
  },
};

export default function CustomerModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { setCustomer } = useCustomer();

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const finishAuth = (data, fallbackMessage = '') => {
    setCustomer({
      ...data.customer,
      accessToken: data.customerToken,
    });
    onSuccess?.(data);
    onClose?.();
    if (data.emailWarning || fallbackMessage) {
      window.setTimeout(() => {
        window.alert(data.emailWarning || fallbackMessage);
      }, 50);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) return setError('Please enter your full name');

    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);

    const phoneError = validatePhone(phone.trim());
    if (phoneError) return setError(phoneError);

    if (!password) return setError('Please create a password');
    if (password.length < 6) return setError('Password must be at least 6 characters long');
    if (password !== confirmPassword) return setError('Passwords do not match');

    const { data } = await api.post('/api/customers/signup', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone.trim()),
      password,
    });

    finishAuth(
      data,
      data.emailVerified
        ? ''
        : 'Your account is ready. Please check your email for the verification link.'
    );
  };

  const handleLogin = async () => {
    if (!identifier.trim()) return setError('Please enter your email address or phone number');
    if (!password) return setError('Please enter your password');

    const { data } = await api.post('/api/customers/login', {
      identifier: identifier.trim(),
      password,
    });

    finishAuth(data);
  };

  const handleForgotPassword = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);

    const { data } = await api.post('/api/customers/password-reset/request', {
      email: email.trim().toLowerCase(),
    });

    setMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') await handleSignup();
      if (mode === 'login') await handleLogin();
      if (mode === 'forgot') await handleForgotPassword();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = ACCOUNT_COPY[mode];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-black">{copy.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{copy.subtitle}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-black">
            <X size={16} />
          </button>
        </div>

        {mode !== 'forgot' && (
          <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${mode === 'signup' ? 'bg-black text-white' : 'text-gray-500'}`}
            >
              New Customer
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${mode === 'login' ? 'bg-black text-white' : 'text-gray-500'}`}
            >
              Returning Customer
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="mb-4 text-xs font-bold text-gray-500 transition-colors hover:text-black"
          >
            Back to sign in
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  inputMode="email"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                  inputMode="tel"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create password"
                  type="password"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  type="password"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <p className="text-xs text-gray-400">
                Ghana: use 10 digits starting with 0. International numbers should include the + country code.
              </p>
            </>
          )}

          {mode === 'login' && (
            <>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Email address or phone number"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type="password"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">You can sign in with either your email address or your phone number.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(identifier.includes('@') ? identifier : '');
                    switchMode('forgot');
                  }}
                  className="shrink-0 text-xs font-bold text-black transition-colors hover:text-[#9a7a00]"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                inputMode="email"
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition-all focus:border-black"
              />
            </div>
          )}

          {message && <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{message}</p>}
          {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#FDC700] py-3.5 text-sm font-extrabold text-black transition-all hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : copy.button}
          </button>
        </form>
      </div>
    </div>
  );
}
