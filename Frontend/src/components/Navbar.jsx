import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, Search, ChevronRight, LayoutDashboard, LogOut, BookOpen } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import CustomerModal from './CustomerModal';

const links = [
  { to: '/',         label: 'Home' },
  { to: '/shop',     label: 'Shop' },
  { to: '/digital-products', label: 'Digital' },
  { to: '/services', label: 'Services' },
  { to: '/blog',     label: 'Blog' },
  { to: '/about',    label: 'About' },
  { to: '/contact',  label: 'Contact' },
];

export default function Navbar({ onCartOpen }) {
  const [open,        setOpen]        = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { pathname }  = useLocation();
  const { cartCount } = useCart();
  const { customer, logout }  = useCustomer();
  const accountMenuRef = useRef(null);
  const isSignedIn = Boolean(customer?.phone);
  const customerLabel = customer?.name?.trim() || 'My Account';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const openAccountModal = () => {
    setShowAccountMenu(false);
    setOpen(false);
    setShowCustomerModal(true);
  };

  const toggleAccountMenu = () => {
    if (!isSignedIn) {
      openAccountModal();
      return;
    }

    setShowAccountMenu((current) => !current);
  };

  const handleLogout = () => {
    logout();
    setShowAccountMenu(false);
    setOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black text-white" style={{ borderBottom: '1px solid #1a1a1a' }}>

        {/* Main bar */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="font-extrabold text-lg tracking-tight shrink-0">
            BELLE <span className="text-[#FDC700]">KREYASHON</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => {
              const isActive =
                pathname === l.to ||
                (l.to === '/shop' && pathname.startsWith('/shop')) ||
                (l.to === '/digital-products' && (pathname === '/digital-products' || pathname === '/digital-library'));
              const isShop   = l.to === '/shop';
              const isDigital = l.to === '/digital-products';
              if (isShop) return (
                <Link key={l.to} to={l.to}
                  className="px-4 py-2 rounded-xl bg-[#FDC700] text-black text-sm font-extrabold hover:bg-yellow-300 transition-all">
                  Shop
                </Link>
              );
              if (isDigital) return (
                <Link key={l.to} to={l.to}
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all border ${isActive ? 'border-[#FDC700] bg-[#FDC700] text-black' : 'border-[#FDC700]/40 text-[#FDC700] hover:border-[#FDC700] hover:bg-white/5'}`}>
                  Digital
                </Link>
              );
              return (
                <Link key={l.to} to={l.to}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isActive ? 'text-[#FDC700]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <button onClick={() => { setShowSearch(s => !s); setOpen(false); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSearch ? 'bg-[#FDC700] text-black' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
              style={{ border: '1px solid #222' }}>
              <Search size={16} />
            </button>

            <Link
              to="/track"
              onClick={() => setShowAccountMenu(false)}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
              style={{ border: '1px solid #222' }}
            >
              <LayoutDashboard size={15} />
              Track
            </Link>

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={toggleAccountMenu}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/5 px-3 text-xs font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                style={{ border: '1px solid #222' }}
              >
                <User size={15} />
                <span className="hidden sm:inline">{isSignedIn ? customerLabel.split(' ')[0] : 'Sign In'}</span>
              </button>

              {showAccountMenu && isSignedIn && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white/10 bg-[#111111] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                    <p className="text-sm font-extrabold text-white">{customer?.name || 'Belle Kreyashon Customer'}</p>
                    <p className="mt-1 text-xs text-gray-400">{customer?.phone || ''}</p>
                    {customer?.email && <p className="mt-1 text-xs text-gray-500">{customer.email}</p>}
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    <Link
                      to="/track"
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-white/6 hover:text-white"
                    >
                      <LayoutDashboard size={15} />
                      My Dashboard
                    </Link>
                    <Link
                      to="/digital-library"
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-white/6 hover:text-white"
                    >
                      <BookOpen size={15} />
                      Digital Library
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-300 transition-all hover:bg-white/6 hover:text-white"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <button onClick={onCartOpen}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              style={{ border: '1px solid #222' }}>
              <ShoppingBag size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FDC700] text-black text-[10px] font-extrabold w-[18px] h-[18px] rounded-full flex items-center justify-center pointer-events-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => { setOpen(o => !o); setShowSearch(false); }}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              style={{ border: '1px solid #222' }}>
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="border-t px-4 py-3" style={{ borderColor: '#1a1a1a', background: '#000' }}>
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                placeholder="Search hair extensions, wigs, skincare..."
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm outline-none placeholder-gray-500 focus:ring-1 focus:ring-[#FDC700]"
                style={{ background: '#111', border: '1px solid #2a2a2a' }}
              />
              <button type="submit"
                className="px-5 py-2.5 bg-[#FDC700] text-black font-extrabold text-sm rounded-xl hover:bg-yellow-300 transition-all">
                Search
              </button>
              <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                <X size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t" style={{ borderColor: '#1a1a1a', background: '#000' }}>
            <div className="px-3 py-3 flex flex-col gap-0.5">
              {links.map(l => {
                const isActive =
                  pathname === l.to ||
                  (l.to === '/shop' && pathname.startsWith('/shop')) ||
                  (l.to === '/digital-products' && (pathname === '/digital-products' || pathname === '/digital-library'));
                const isShop   = l.to === '/shop';
                const isDigital = l.to === '/digital-products';
                return (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isShop
                        ? 'bg-[#FDC700] text-black font-extrabold my-1'
                        : isDigital
                          ? 'border border-[#FDC700]/40 text-[#FDC700] my-1'
                        : isActive
                          ? 'text-[#FDC700] bg-white/5'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}>
                    {l.label}
                    <ChevronRight size={14} className={isShop ? 'text-black/50' : 'text-gray-600'} />
                  </Link>
                );
              })}
            </div>

            {/* Mobile bottom actions */}
            <div className="px-3 pt-3">
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FDC700]">Customer Access</p>
                {isSignedIn ? (
                  <>
                    <p className="mt-2 text-sm font-extrabold text-white">{customer?.name || 'My Account'}</p>
                    <p className="mt-1 text-xs text-gray-400">{customer?.phone || ''}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        to="/track"
                        onClick={() => setOpen(false)}
                        className="rounded-xl bg-white/5 px-3 py-2.5 text-center text-sm font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/digital-library"
                        onClick={() => setOpen(false)}
                        className="rounded-xl bg-white/5 px-3 py-2.5 text-center text-sm font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                      >
                        Library
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm font-bold text-gray-300 transition-all hover:bg-white/6 hover:text-white"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-gray-400">Sign in or create your customer profile to track orders, bookings, and digital access more easily.</p>
                    <button
                      type="button"
                      onClick={openAccountModal}
                      className="mt-3 w-full rounded-xl bg-[#FDC700] px-3 py-2.5 text-sm font-extrabold text-black transition-all hover:bg-yellow-300"
                    >
                      Sign In / Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-3 pb-4 flex gap-2 border-t pt-3 mt-3" style={{ borderColor: '#1a1a1a' }}>
              <Link
                to="/track"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold text-gray-300 transition-all"
                style={{ background: '#111', border: '1px solid #222' }}
              >
                Track
              </Link>
              <button onClick={() => { onCartOpen(); setOpen(false); }}
                className="flex-1 py-2.5 rounded-xl text-center text-sm font-extrabold bg-[#FDC700] text-black hover:bg-yellow-300 transition-all">
                Cart {cartCount > 0 ? `(${cartCount})` : ''}
              </button>
            </div>
          </div>
        )}
      </nav>
      {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} />}
    </>
  );
}
