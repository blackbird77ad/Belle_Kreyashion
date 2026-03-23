import { Link } from 'react-router-dom';
import { Facebook, Phone, MessageCircle } from 'lucide-react';
import { PHONE, FACEBOOK, WHATSAPP } from '../data/contact';

export default function Footer() {
  return (
    <footer className="bg-black text-white pt-12 pb-6 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div>
          <div className="font-extrabold text-lg mb-1">BELLE <span className="text-[#FDC700]">KREYASHON</span></div>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">Premium hair, beauty and lifestyle. Nationwide and international delivery.</p>
          <div className="flex gap-3">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-500"><MessageCircle size={16} /></a>
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500"><Facebook size={16} /></a>
            <a href={`tel:${PHONE}`} className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600"><Phone size={16} /></a>
          </div>
        </div>
        <div>
          <div className="font-bold text-sm mb-3 text-[#FDC700] uppercase tracking-wider">Shop</div>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <Link to="/shop" className="hover:text-white">All Products</Link>
            <Link to="/shop?category=Hair+Extensions" className="hover:text-white">Hair Extensions</Link>
            <Link to="/shop?category=Wigs" className="hover:text-white">Wigs</Link>
            <Link to="/shop?category=Beauty+%26+Skincare" className="hover:text-white">Beauty & Skincare</Link>
            <Link to="/orders" className="hover:text-white">My Orders</Link>
          </div>
        </div>
        <div>
          <div className="font-bold text-sm mb-3 text-[#FDC700] uppercase tracking-wider">Company</div>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white">About Us</Link>
            <Link to="/services" className="hover:text-white">Training & Services</Link>
            <Link to="/blog" className="hover:text-white">Blog</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
        <div>
          <div className="font-bold text-sm mb-3 text-[#FDC700] uppercase tracking-wider">Contact Us</div>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 flex items-center gap-2"><MessageCircle size={14} /> WhatsApp</a>
            <a href={`tel:${PHONE}`} className="hover:text-white flex items-center gap-2"><Phone size={14} /> {PHONE}</a>
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 flex items-center gap-2"><Facebook size={14} /> Belle Kreyashon Hair</a>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
        <span>© {new Date().getFullYear()} Belle Kreyashon. All rights reserved.</span>
        <span>Built by <a href="https://thebrandhelper.com" target="_blank" rel="noopener noreferrer" className="text-[#FDC700] hover:underline">The BrandHelper</a></span>
      </div>
    </footer>
  );
}