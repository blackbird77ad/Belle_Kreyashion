import { MessageCircle, Phone, Facebook, MapPin, ChevronRight, Clock } from 'lucide-react';
import SEO from '../components/SEO';
import { PHONE, WHATSAPP, FACEBOOK } from '../data/contact';

const CONTACTS = [
  {
    icon: <MessageCircle size={20} />,
    label: 'WhatsApp',
    value: PHONE,
    href: `https://wa.me/${WHATSAPP}`,
    iconBg: '#e8f8f0',
    iconColor: '#16a34a',
  },
  {
    icon: <Phone size={20} />,
    label: 'Call Us',
    value: PHONE,
    href: `tel:${PHONE}`,
    iconBg: '#e8f0fb',
    iconColor: '#2563eb',
  },
  {
    icon: <Facebook size={20} />,
    label: 'Facebook',
    value: 'Belle Kreyashon Hair',
    href: FACEBOOK,
    iconBg: '#e8eef8',
    iconColor: '#1d4ed8',
  },
  {
    icon: <MapPin size={20} />,
    label: 'Location',
    value: 'Osu, Accra · Nationwide & International Delivery',
    href: null,
    iconBg: '#fef0f0',
    iconColor: '#dc2626',
  },
];

export default function Contact() {
  return (
    <div className="pt-16 min-h-screen bg-white">
      <SEO
        title="Contact Us"
        description="Get in touch with Belle Kreyashon. WhatsApp, call or visit us in Osu, Accra, Ghana. Nationwide and international delivery."
        url="/contact"
      />

      {/* Hero */}
      <div className="bg-black text-white py-20 px-4 text-center" style={{ borderBottom: '3px solid #FDC700' }}>
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Get In Touch</p>
        <h1 className="text-4xl md:text-6xl font-extrabold">Contact Us</h1>
      </div>

      {/* Cards */}
      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="flex flex-col gap-3">
          {CONTACTS.map((c, i) => {
            const inner = (
              <>
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{ background: c.iconBg }}>
                  <span style={{ color: c.iconColor }}>{c.icon}</span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{c.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{c.value}</p>
                </div>

                {/* Arrow */}
                {c.href && <ChevronRight size={16} className="text-gray-300 shrink-0 transition-colors duration-200" />}
              </>
            );

            const cls = `flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 group ${
              c.href
                ? 'border-gray-100 bg-gray-50 hover:bg-black hover:border-black cursor-pointer'
                : 'border-gray-100 bg-gray-50 cursor-default'
            }`;

            const hoverStyle = `
              .contact-card-${i}:hover .contact-label-${i} { color: #555 !important; }
              .contact-card-${i}:hover .contact-value-${i} { color: #fff !important; }
              .contact-card-${i}:hover .contact-icon-${i} { background: #FDC700 !important; }
              .contact-card-${i}:hover .contact-icon-${i} * { color: #000 !important; }
              .contact-card-${i}:hover svg.chevron-${i} { color: #555 !important; }
            `;

            if (c.href) return (
              <div key={i}>
                <style>{hoverStyle}</style>
                <a href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={`contact-card-${i} flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200`}
                  style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
                  <div className={`contact-icon-${i} w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200`}
                    style={{ background: c.iconBg }}>
                    <span style={{ color: c.iconColor }}>{c.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`contact-label-${i} text-xs font-bold uppercase tracking-wider mb-0.5 transition-colors duration-200`}
                      style={{ color: '#999' }}>{c.label}</p>
                    <p className={`contact-value-${i} text-sm font-bold truncate transition-colors duration-200`}
                      style={{ color: '#111' }}>{c.value}</p>
                  </div>
                  <ChevronRight size={16} className={`chevron-${i} shrink-0 transition-colors duration-200`} style={{ color: '#ccc' }} />
                </a>
              </div>
            );

            return (
              <div key={i}
                className="flex items-center gap-4 p-5 rounded-2xl border"
                style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: c.iconBg }}>
                  <span style={{ color: c.iconColor }}>{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#999' }}>{c.label}</p>
                  <p className="text-sm font-bold truncate" style={{ color: '#111' }}>{c.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 pt-8 text-center" style={{ borderTop: '1px solid #f0f0f0' }}>
          <div className="inline-flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Clock size={13} />
            <span>We typically reply within <strong className="text-gray-700">1 hour</strong> on WhatsApp</span>
          </div>
          <p className="text-xs text-gray-400">Monday – Sunday &nbsp;·&nbsp; 8am – 9pm</p>
        </div>
      </div>
    </div>
  );
}