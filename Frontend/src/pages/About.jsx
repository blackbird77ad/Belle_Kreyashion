import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Globe, Users, Sparkles, Truck } from 'lucide-react';

const values = [
  { icon: <Award size={24} />, title: 'Premium Quality', desc: 'Every product is carefully selected. We only stock what we believe in and use ourselves.' },
  { icon: <Heart size={24} />, title: 'Customer First', desc: 'Your satisfaction is our priority. From browsing to delivery, we make sure every experience is excellent.' },
  { icon: <Globe size={24} />, title: 'Global Reach', desc: 'Based in Ghana, we deliver nationwide and internationally — because great hair knows no borders.' },
  { icon: <Users size={24} />, title: 'Community', desc: 'We empower hairstylists, beauticians and entrepreneurs through training and consultation.' },
  { icon: <Sparkles size={24} />, title: 'Authenticity', desc: 'No compromises on quality. Every extension, every wig, every tool — authentic and tested.' },
  { icon: <Truck size={24} />, title: 'Fast Delivery', desc: 'We know you can\'t wait. We process orders quickly and deliver across Ghana and beyond.' },
];

export default function About() {
  return (
    <div className="pt-16 min-h-screen">

      {/* Hero */}
      <div className="relative bg-black text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/images/hairextension.avif" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">About Belle Kreyashon</h1>
          <p className="text-gray-300 text-base leading-relaxed">Premium hair, beauty and lifestyle — crafted for those who refuse to compromise.</p>
        </div>
      </div>

      {/* Story */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Who We Are</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">More Than Just a Hair Store</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Belle Kreyashon was born from a simple belief — every woman deserves to feel beautiful, confident and powerful. We started as a small hair supplies business in Ghana and have grown into a full premium hair, beauty and lifestyle brand.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              We supply premium hair extensions, wigs, braiding tools, mannequins, beauty supplies, health products and fashion accessories to customers across Ghana and internationally. But beyond products, we invest in people — offering professional hair training sessions and consultations to help our community build skills and businesses.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Whether you are a stylist looking for quality tools, a student learning the craft, or a customer who just wants their hair done right — Belle Kreyashon is your home.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img src="/images/hairextension.avif" alt="Hair Extensions" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mt-6">
              <img src="/images/sllek-wig.jpg" alt="Wigs" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img src="/images/anua-beauty.jpg" alt="Beauty" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mt-6">
              <img src="/images/comb-tool.png" alt="Tools" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">What We Stand For</p>
            <h2 className="text-2xl md:text-3xl font-extrabold">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-2xl bg-[#FDC700] flex items-center justify-center mb-4 text-black">{v.icon}</div>
                <h3 className="font-extrabold text-base mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-black text-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Happy Customers' },
            { value: '100+', label: 'Products Available' },
            { value: '10+', label: 'Countries Served' },
            { value: '5★', label: 'Average Rating' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-extrabold text-[#FDC700] mb-1">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Training CTA */}
      <section className="py-16 px-4 max-w-3xl mx-auto text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Level Up Your Skills</p>
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Join Our Training Programme</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">We run regular professional hair training sessions for beginners and experienced stylists. Learn from the best, get certified, and grow your business.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/services" className="flex items-center gap-2 px-6 py-3 bg-black text-white font-extrabold rounded-full hover:bg-gray-900 transition-all text-sm">
            View Services <ArrowRight size={16} />
          </Link>
          <Link to="/shop" className="flex items-center gap-2 px-6 py-3 bg-[#FDC700] text-black font-extrabold rounded-full hover:bg-yellow-300 transition-all text-sm">
            Shop Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}