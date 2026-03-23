import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, Phone, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { PHONE } from '../data/contact';

const links = [
  { to: '/',        label: 'Home' },
  { to: '/shop',    label: 'Shop' },
  { to: '/services',label: 'Services' },
  { to: '/blog',    label: 'Blog' },
  { to: '/about',   label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar({ onCartOpen }) {
  const [open,        setOpen]        = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  const { customer }  = useCustomer();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
      setShowSearch(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-extrabold text-xl tracking-tight shrink-0">
            BELLE <span className="text-[#FDC700]">KREYASHON</span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`text-sm font-semibold transition-colors hover:text-[#FDC700] ${pathname === l.to ? 'text-[#FDC700]' : 'text-white'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowSearch(s => !s)} className="text-gray-300 hover:text-[#FDC700] transition-colors p-1">
              <Search size={20} />
            </button>
            {customer && (
              <Link to="/orders" className="text-gray-300 hover:text-[#FDC700] transition-colors p-1">
                <User size={20} />
              </Link>
            )}
            <button onClick={onCartOpen} className="relative p-1">
              <ShoppingBag size={22} className="hover:text-[#FDC700] transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FDC700] text-black text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </button>
            <button onClick={() => setOpen(!open)} className="md:hidden p-1">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="border-t border-gray-800 px-4 py-3 bg-black">
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                placeholder="Search products, categories..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-white text-sm placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#FDC700]" />
              <button type="submit" className="px-4 py-2.5 bg-[#FDC700] text-black font-bold text-sm rounded-xl">Search</button>
              <button type="button" onClick={() => setShowSearch(false)} className="px-3 py-2.5 bg-gray-700 text-white rounded-xl"><X size={14} /></button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden bg-black border-t border-gray-800 px-4 py-4 flex flex-col gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={`text-sm font-semibold py-2.5 border-b border-gray-800 ${pathname === l.to ? 'text-[#FDC700]' : 'text-white'}`}>
                {l.label}
              </Link>
            ))}
            <a href={`tel:${PHONE}`} className="text-sm text-gray-400 flex items-center gap-2 pt-2">
              <Phone size={14} /> {PHONE}
            </a>
          </div>
        )}
      </nav>
    </>
  );
}