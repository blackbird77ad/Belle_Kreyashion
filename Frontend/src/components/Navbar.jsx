import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, Search, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';

const links = [
  { to: '/',         label: 'Home' },
  { to: '/shop',     label: 'Shop' },
  { to: '/services', label: 'Services' },
  { to: '/blog',     label: 'Blog' },
  { to: '/about',    label: 'About' },
  { to: '/contact',  label: 'Contact' },
];

export default function Navbar({ onCartOpen }) {
  const [open,        setOpen]        = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { pathname }  = useLocation();
  const { cartCount } = useCart();
  const { customer }  = useCustomer();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
      setShowSearch(false);
      setSearchQuery('');
    }
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
              const isActive = pathname === l.to;
              const isShop   = l.to === '/shop';
              if (isShop) return (
                <Link key={l.to} to={l.to}
                  className="px-4 py-2 rounded-xl bg-[#FDC700] text-black text-sm font-extrabold hover:bg-yellow-300 transition-all">
                  Shop
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

            {/* My Orders */}
            {customer && (
              <Link to="/orders"
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                style={{ border: '1px solid #222' }}>
                <User size={16} />
              </Link>
            )}

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
                const isActive = pathname === l.to;
                const isShop   = l.to === '/shop';
                return (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isShop
                        ? 'bg-[#FDC700] text-black font-extrabold my-1'
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
            <div className="px-3 pb-4 flex gap-2 border-t pt-3" style={{ borderColor: '#1a1a1a' }}>
              {customer && (
                <Link to="/orders" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold text-gray-400 hover:text-white transition-all"
                  style={{ background: '#111', border: '1px solid #222' }}>
                  My Orders
                </Link>
              )}
              <button onClick={() => { onCartOpen(); setOpen(false); }}
                className="flex-1 py-2.5 rounded-xl text-center text-sm font-extrabold bg-[#FDC700] text-black hover:bg-yellow-300 transition-all">
                Cart {cartCount > 0 ? `(${cartCount})` : ''}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}