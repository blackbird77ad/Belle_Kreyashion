import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCustomer } from '../context/CustomerContext';

// ─── Phone validation ─────────────────────────────────────────────────────────
// Accepts:
//   Ghana local:       024xxxxxxx, 054xxxxxxx etc  (10 digits starting with 0)
//   Ghana with code:   +233xxxxxxxxx or 233xxxxxxxxx
//   International:     +[country code][number] — min 7, max 15 digits
function validatePhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, ''); // strip spaces, dashes, brackets, dots

  if (!cleaned) return 'Please enter your phone number';

  // Must contain only digits and optional leading +
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number can only contain digits';

  // Ghana local: starts with 0, exactly 10 digits
  if (cleaned.startsWith('0')) {
    if (cleaned.length !== 10) return 'Ghana numbers must be 10 digits (e.g. 0241234567)';
    const prefix = cleaned.slice(0, 3);
    const validGhanaPrefixes = ['020','023','024','025','026','027','028','029','050','053','054','055','056','057','059'];
    if (!validGhanaPrefixes.includes(prefix)) return `"${prefix}" is not a valid Ghana network prefix`;
    return null;
  }

  // Ghana with country code: 233xxxxxxxxx (12 digits) or +233xxxxxxxxx
  if (cleaned.startsWith('+233') || cleaned.startsWith('233')) {
    const digits = cleaned.replace(/^\+/, '');
    if (digits.length !== 12) return 'Ghana number with country code must be 12 digits (e.g. +233241234567)';
    return null;
  }

  // International: must start with + and be 8–15 digits total
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (digits.length < 7 || digits.length > 15) return 'International number must be 7–15 digits after the + sign';
    return null;
  }

  // Bare international without + — too ambiguous, ask for + prefix
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    return 'For international numbers please include the + country code (e.g. +447911123456)';
  }

  return 'Please enter a valid phone number';
}

// Normalise to a consistent format before saving
function normalisePhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  // Convert 233... to +233...
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return '+' + cleaned;
  return cleaned;
}

export default function CustomerModal({ onClose, onSuccess }) {
  const [isReturning, setIsReturning] = useState(false);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { setCustomer } = useCustomer();

  const submit = async () => {
    setError('');
    if (!isReturning && !name.trim()) return setError('Please enter your name');

    const phoneErr = validatePhone(phone.trim());
    if (phoneErr) return setError(phoneErr);

    const normalisedPhone = normalisePhone(phone.trim());

    setLoading(true);
    try {
      const { data } = await api.post('/api/customers/identify', {
        name:  isReturning ? normalisedPhone : name.trim(),
        phone: normalisedPhone,
      });
      setCustomer(data.customer);
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="font-extrabold text-lg">Almost there!</h2>
            <p className="text-gray-400 text-sm mt-0.5">Quick detail so we can process your order</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => { setIsReturning(false); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isReturning ? 'bg-black text-white' : 'text-gray-500'}`}>
            New Customer
          </button>
          <button onClick={() => { setIsReturning(true); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isReturning ? 'bg-black text-white' : 'text-gray-500'}`}>
            Returning Customer
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {!isReturning && (
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all" />
            </div>
          )}
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Phone number (e.g. 0241234567 or +447911123456)"
              inputMode="tel"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all" />
          </div>
          {/* Hint text */}
          <p className="text-xs text-gray-400 -mt-1">
            Ghana: 10 digits starting with 0 &nbsp;·&nbsp; International: include + country code
          </p>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#FDC700] text-black font-extrabold text-sm hover:bg-yellow-300 transition-all disabled:opacity-50">
          {loading ? 'Please wait...' : 'Continue'}
        </button>
      </motion.div>
    </motion.div>
  );
}