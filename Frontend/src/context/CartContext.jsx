import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../hooks/useApi';
import { useCustomer } from './CustomerContext';
import { getAttributionSnapshot } from '../utils/attribution';
import { trackAddToCart } from '../utils/marketing';

const CartContext = createContext();
const readStoredCart = () => {
  try {
    const saved = localStorage.getItem('bk_cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const calculateCheckoutPrice = (product, isWholesale = false) => {
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
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => readStoredCart());
  const { customer } = useCustomer();
  const timerRef = useRef(null);

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('bk_cart', JSON.stringify(cart)); }
    catch {}
  }, [cart]);

  // Keep cart state in sync across open tabs/windows.
  useEffect(() => {
    const syncStoredCart = (event) => {
      if (event.key !== null && event.key !== 'bk_cart') return;
      setCart(readStoredCart());
    };

    window.addEventListener('storage', syncStoredCart);
    return () => window.removeEventListener('storage', syncStoredCart);
  }, []);

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
    const key = product.isDigital ? `digital-${product._id}` : `${product._id}-${isWholesale}-${variant}`;
    const existing = cart.find((item) => item.key === key);
    const currentQty = existing ? existing.qty : 0;
    const requestedQty = product.isDigital ? 1 : qty;
    const maxAllowed = product.isDigital ? 1 : (product.stock !== null ? product.stock : Infinity);
    const addQty = Math.min(requestedQty, maxAllowed - currentQty);

    if (addQty <= 0) return;

    const digitalAccessKind = product.isDigital ? (product.digitalAccessKind || 'paid') : null;
    const checkoutPrice = calculateCheckoutPrice(product, isWholesale);
    const priceNow = product.isDigital && digitalAccessKind !== 'paid' ? 0 : checkoutPrice;
    const trialChargeAmount = product.isDigital && digitalAccessKind === 'trial' ? checkoutPrice : null;
    const sourceAttribution = getAttributionSnapshot();

    if (existing) {
      setCart((prev) => prev.map((item) => item.key === key ? { ...item, qty: item.qty + addQty } : item));
    } else {
      setCart((prev) => [...prev, {
        key,
        productId: product._id,
        slug: product.slug || '',
        name: product.name,
        brand: 'Belle Kreyashon',
        category: product.category || '',
        image: product.images?.[0] || '',
        price: priceNow,
        qty: product.isDigital ? 1 : qty,
        isWholesale,
        isDigital: !!product.isDigital,
        digitalAccessKind,
        freeTrialDays: product.isDigital && digitalAccessKind === 'trial' ? (product.freeTrialDays || 7) : 0,
        trialChargeAmount,
        digitalType: product.digitalType || '',
        isSeries: !!product.isSeries,
        seriesTitle: product.seriesTitle || '',
        seriesDescription: product.seriesDescription || '',
        variant,
        sourceAttribution,
      }]);
    }

    trackAddToCart({
      product: {
        _id: product._id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        brand: 'Belle Kreyashon',
      },
      quantity: addQty,
      price: priceNow,
      variant,
      customer,
    });
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) return setCart(prev => prev.filter(i => i.key !== key));
    setCart(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  };

  const removeFromCart = (key) => setCart(prev => prev.filter(i => i.key !== key));
  const removeOwnedDigitalItems = (ownedProductIds = []) => {
    const ownedIds = new Set(
      ownedProductIds
        .map((productId) => String(productId || '').trim())
        .filter(Boolean)
    );
    if (!ownedIds.size) return;

    setCart((prev) => prev.filter((item) => !item.isDigital || !ownedIds.has(String(item.productId))));
  };
  const clearCart = () => { setCart([]); try { localStorage.removeItem('bk_cart'); } catch {} };

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal  = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, removeOwnedDigitalItems, clearCart, cartCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
