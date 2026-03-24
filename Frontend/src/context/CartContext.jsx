import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../hooks/useApi';
import { useCustomer } from './CustomerContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('bk_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const { customer } = useCustomer();
  const timerRef = useRef(null);

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('bk_cart', JSON.stringify(cart)); }
    catch {}
  }, [cart]);

  // Save abandoned cart 30 seconds after cart changes (if customer is known)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cart.length === 0 || !customer?.phone) return;

    timerRef.current = setTimeout(() => {
      api.post('/api/orders/abandoned', {
        name:  customer.name,
        phone: customer.phone,
        items: cart.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })),
      }).catch(() => {});
    }, 30 * 1000); // 30 seconds

    return () => clearTimeout(timerRef.current);
  }, [cart, customer]);

  const addToCart = (product, qty = 1, isWholesale = false, variant = null) => {
    const key = `${product._id}-${isWholesale}-${variant}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      const currentQty = existing ? existing.qty : 0;
      // Cap total qty at stock limit
      const maxAllowed = product.stock !== null ? product.stock : Infinity;
      const addQty = Math.min(qty, maxAllowed - currentQty);
      if (addQty <= 0) return prev; // already at max
      if (existing) return prev.map(i => i.key === key ? { ...i, qty: i.qty + addQty } : i);
      return [...prev, {
        key,
        productId: product._id,
        name:      product.name,
        image:     product.images?.[0] || '',
        price: (() => {
          const base = isWholesale ? product.wholesalePrice : product.retailPrice;
          if (!isWholesale && product.discount?.active) {
            const now = new Date();
            const notExpired = !product.discount.endDate || new Date(product.discount.endDate) >= now;
            const notExhausted = !product.discount.limitCustomers || (product.discount.usedCount || 0) < product.discount.limitCustomers;
            if (notExpired && notExhausted) {
              if (product.discount.type === 'percent') return Math.round(base * (1 - product.discount.value / 100));
              return Math.max(0, base - product.discount.value);
            }
          }
          return base;
        })(),
        qty,
        isWholesale,
        variant,
      }];
    });
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) return setCart(prev => prev.filter(i => i.key !== key));
    setCart(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  };

  const removeFromCart = (key) => setCart(prev => prev.filter(i => i.key !== key));
  const clearCart = () => { setCart([]); try { localStorage.removeItem('bk_cart'); } catch {} };

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal  = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, clearCart, cartCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);