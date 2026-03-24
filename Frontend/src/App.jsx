import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CustomerProvider } from './context/CustomerContext';
import { CartProvider } from './context/CartContext';
import Navbar            from './components/Navbar';
import Footer            from './components/Footer';
import CartDrawer        from './components/CartDrawer';
import Home              from './pages/Home';
import Shop              from './pages/Shop';
import Product           from './pages/Product';
import Checkout          from './pages/Checkout';
import Services          from './pages/Services';
import Blog              from './pages/Blog';
import BlogPost          from './pages/BlogPost';
import About             from './pages/About';
import Contact           from './pages/Contact';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderHistory      from './pages/OrderHistory';
import Admin             from './pages/Admin';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
};

function Layout() {
  const { pathname } = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const isAdmin = pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar onCartOpen={() => setCartOpen(true)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <main className="flex-1">
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/shop"            element={<Shop />} />
          <Route path="/shop/checkout"   element={<Checkout />} />
          <Route path="/shop/:id"        element={<Product />} />
          <Route path="/services"        element={<Services />} />
          <Route path="/blog"            element={<Blog />} />
          <Route path="/blog/:id"        element={<BlogPost />} />
          <Route path="/about"           element={<About />} />
          <Route path="/contact"         element={<Contact />} />
          <Route path="/order-confirmed" element={<OrderConfirmation />} />
          <Route path="/orders"          element={<OrderHistory />} />
          <Route path="/admin"           element={<Admin />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomerProvider>
        <CartProvider>
          <ScrollToTop />
          <Layout />
        </CartProvider>
      </CustomerProvider>
    </BrowserRouter>
  );
}