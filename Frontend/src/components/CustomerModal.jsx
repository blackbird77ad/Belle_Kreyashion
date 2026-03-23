import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone } from 'lucide-react';
import { api } from '../hooks/useApi';
import { useCustomer } from '../context/CustomerContext';

export default function CustomerModal({ onClose, onSuccess }) {
  const [isReturning, setIsReturning] = useState(false);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { setCustomer } = useCustomer();

  const submit = async () => {
    setError('');
    if (!phone.trim()) return setError('Please enter your phone number');
    if (!isReturning && !name.trim()) return setError('Please enter your name');
    setLoading(true);
    try {
      const { data } = await api.post('/api/customers/identify', {
        name: isReturning ? phone.trim() : name.trim(),
        phone: phone.trim(),
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
            <input value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Phone number (e.g. 0241234567)"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#FDC700] text-black font-extrabold text-sm hover:bg-yellow-300 transition-all disabled:opacity-50">
          {loading ? 'Please wait...' : 'Add to Cart'}
        </button>
      </motion.div>
    </motion.div>
  );
}