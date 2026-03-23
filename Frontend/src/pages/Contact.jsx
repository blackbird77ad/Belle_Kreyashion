import { MessageCircle, Phone, Facebook, MapPin } from 'lucide-react';
import { PHONE, WHATSAPP, FACEBOOK } from '../data/contact';

export default function Contact() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-black text-white py-20 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Get In Touch</p>
        <h1 className="text-4xl md:text-6xl font-extrabold">Contact Us</h1>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="grid gap-4">
          {[
            { icon: <MessageCircle size={22} />, label: 'WhatsApp', value: PHONE, href: `https://wa.me/${WHATSAPP}`, color: 'text-green-500' },
            { icon: <Phone size={22} />,          label: 'Call Us',  value: PHONE, href: `tel:${PHONE}`,            color: 'text-blue-500' },
            { icon: <Facebook size={22} />,       label: 'Facebook', value: 'Belle Kreyashon Hair', href: FACEBOOK, color: 'text-blue-600' },
            { icon: <MapPin size={22} />,          label: 'Location', value: 'Ghana — Nationwide & International Delivery', href: null, color: 'text-red-500' },
          ].map((c, i) => (
            <a key={i} href={c.href || '#'} target={c.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-black hover:text-white transition-all duration-300 group border border-gray-100 hover:border-black">
              <span className={`${c.color} group-hover:text-[#FDC700] transition-colors`}>{c.icon}</span>
              <div>
                <div className="text-xs text-gray-400 group-hover:text-gray-400 font-bold uppercase tracking-wider">{c.label}</div>
                <div className="font-bold text-sm mt-0.5">{c.value}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}