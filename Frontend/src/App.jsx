import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { CustomerProvider } from './context/CustomerContext';
import { IntlProvider } from './context/IntlContext';
import { CartProvider } from './context/CartContext';
import Navbar     from './components/Navbar';
import Footer     from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ConsentBanner from './components/ConsentBanner';
import MarketingTracker from './components/MarketingTracker';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { rememberAttributionFromLocation } from './utils/attribution';

// Home loads immediately — it's the first thing customers see
import Home from './pages/Home';

// Everything else loads only when the customer navigates to it
const Shop             = lazy(() => import('./pages/Shop'));
const DigitalProducts  = lazy(() => import('./pages/DigitalProducts'));
const Product          = lazy(() => import('./pages/Product'));
const Checkout         = lazy(() => import('./pages/Checkout'));
const Services         = lazy(() => import('./pages/Services'));
const Blog             = lazy(() => import('./pages/Blog'));
const BlogPost         = lazy(() => import('./pages/BlogPost'));
const About            = lazy(() => import('./pages/About'));
const Contact          = lazy(() => import('./pages/Contact'));
const OrderConfirmation= lazy(() => import('./pages/OrderConfirmation'));
const OrderHistory     = lazy(() => import('./pages/OrderHistory'));
const DigitalLibrary   = lazy(() => import('./pages/DigitalLibrary'));
const CustomerVerify   = lazy(() => import('./pages/CustomerVerify'));
const CustomerResetPassword = lazy(() => import('./pages/CustomerResetPassword'));
const RecoverCart       = lazy(() => import('./pages/RecoverCart'));
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

const AttributionTracker = () => {
  const location = useLocation();

  useEffect(() => {
    rememberAttributionFromLocation(location);
  }, [location]);

  return null;
};

function Layout() {
  const { pathname } = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const isAdmin = pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <MarketingTracker />}
      {!isAdmin && <Navbar onCartOpen={() => setCartOpen(true)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/shop"            element={<Shop />} />
            <Route path="/digital-products" element={<DigitalProducts />} />
            <Route path="/shop/checkout"   element={<Checkout />} />
            <Route path="/shop/:slugOrId"  element={<Product />} />
            <Route path="/services"        element={<Services />} />
            <Route path="/blog"            element={<Blog />} />
            <Route path="/blog/:slugOrId"  element={<BlogPost />} />
            <Route path="/about"           element={<About />} />
            <Route path="/contact"         element={<Contact />} />
            <Route path="/order-confirmed" element={<OrderConfirmation />} />
            <Route path="/track"           element={<OrderHistory />} />
            <Route path="/orders"          element={<OrderHistory />} />
            <Route path="/digital-library" element={<DigitalLibrary />} />
            <Route path="/account/verify"  element={<CustomerVerify />} />
            <Route path="/account/reset-password" element={<CustomerResetPassword />} />
            <Route path="/recover-cart"      element={<RecoverCart />} />
            <Route path="/admin"           element={<Admin />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <ConsentBanner />}
      {!isAdmin && <PwaInstallPrompt />}
      {!isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomerProvider>
        <IntlProvider>
          <CartProvider>
            <ScrollToTop />
            <AttributionTracker />
            <Layout />
          </CartProvider>
        </IntlProvider>
      </CustomerProvider>
    </BrowserRouter>
  );
}
