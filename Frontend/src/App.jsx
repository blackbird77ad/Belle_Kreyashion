import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { CustomerProvider } from './context/CustomerContext';
import { CartProvider } from './context/CartContext';
import Navbar     from './components/Navbar';
import Footer     from './components/Footer';
import CartDrawer from './components/CartDrawer';

// Home loads immediately — it's the first thing customers see
import Home from './pages/Home';

// Everything else loads only when the customer navigates to it
const Shop             = lazy(() => import('./pages/Shop'));
const Product          = lazy(() => import('./pages/Product'));
const Checkout         = lazy(() => import('./pages/Checkout'));
const Services         = lazy(() => import('./pages/Services'));
const Blog             = lazy(() => import('./pages/Blog'));
const BlogPost         = lazy(() => import('./pages/BlogPost'));
const About            = lazy(() => import('./pages/About'));
const Contact          = lazy(() => import('./pages/Contact'));
const OrderConfirmation= lazy(() => import('./pages/OrderConfirmation'));
const OrderHistory     = lazy(() => import('./pages/OrderHistory'));
const Admin            = lazy(() => import('./pages/Admin'));

// Simple loading spinner shown while a page is being loaded
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FDC700] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
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