import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ open, onClose }) {
  const { cart, updateQty, removeFromCart, cartCount, subtotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/shop/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <div className="font-extrabold text-lg flex items-center gap-2">
                  <ShoppingBag size={20} /> Your Cart
                </div>
                <div className="text-xs text-gray-400">{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center hover:border-black transition-all">
                <X size={16} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ShoppingBag size={48} className="text-gray-200 mb-4" />
                <p className="font-bold text-gray-400">Your cart is empty</p>
                <button onClick={onClose} className="mt-4 text-sm text-black underline">Continue shopping</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                  {cart.map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                      <img src={item.image} alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-200"
                        onError={e => { e.target.style.display = 'none'; }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm leading-tight truncate">{item.name}</div>
                        {item.variant && <div className="text-xs text-gray-400">{item.variant}</div>}
                        {item.isWholesale && <div className="text-xs text-[#FDC700] font-bold">Wholesale</div>}
                        <div className="text-sm font-bold mt-1">GHS {(item.price * item.qty).toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => updateQty(item.key, item.qty - 1)}
                            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:border-black transition-all">
                            <Minus size={10} />
                          </button>
                          <span className="font-extrabold text-sm">{item.qty}</span>
                          <button onClick={() => updateQty(item.key, item.qty + 1)}
                            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:border-black transition-all">
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.key)}
                        className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">Subtotal</span>
                    <span className="font-extrabold text-lg">GHS {subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 text-center">Delivery fee added at checkout</p>
                  <button onClick={handleCheckout}
                    className="w-full py-3.5 rounded-2xl bg-black text-white font-extrabold text-sm text-center hover:bg-gray-900 transition-all">
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}