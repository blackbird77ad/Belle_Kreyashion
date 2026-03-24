import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Globe, Users, Sparkles, Truck } from 'lucide-react';

const values = [
  { icon: <Award size={24} />, title: 'Premium Quality', desc: 'Every product is carefully selected. We only stock what we believe in — from hair to health, beauty to fashion.' },
  { icon: <Heart size={24} />, title: 'Customer First', desc: 'Your satisfaction is our priority. From browsing to delivery, we make sure every experience is excellent.' },
  { icon: <Globe size={24} />, title: 'Global Reach', desc: 'Based in Ghana, we deliver nationwide and internationally — because great products know no borders.' },
  { icon: <Users size={24} />, title: 'Community', desc: 'We empower people through training and consultation — helping our community build skills and businesses.' },
  { icon: <Sparkles size={24} />, title: 'Authenticity', desc: 'No compromises on quality. Every item we sell is authentic, tested and sourced with care.' },
  { icon: <Truck size={24} />, title: 'Fast Delivery', desc: 'We process orders quickly and deliver across Ghana and beyond. We know you can\'t wait.' },
];

export default function About() {
  return (
    <div className="pt-16 min-h-screen">

      {/* Hero */}
      <div className="relative bg-black text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/shop-category/hairextension.avif" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">About Belle Kreyashon</h1>
          <p className="text-gray-300 text-base leading-relaxed">Hair, beauty, fashion, health and lifestyle — everything you need, all in one place.</p>
        </div>
      </div>

      {/* Story */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Who We Are</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">More Than Just a Store</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Belle Kreyashon was born from a simple belief — everyone deserves access to quality products that make them look and feel their best. We started as a hair supplies business in Ghana and have grown into a full lifestyle brand covering hair, beauty, skincare, fashion, health, wellness and even gadgets.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              We supply premium products to customers across Ghana and internationally. But beyond products, we invest in people — offering professional training sessions and consultations to help our community build skills and businesses.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Whether you are a stylist looking for quality tools, a fashion lover wanting the latest styles, or someone building a business — Belle Kreyashon is your home.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img src="/shop-category/hairextension.avif" alt="Hair Extensions" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mt-6">
              <img src="/shop-category/sllek-wig.jpg" alt="Wigs" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img src="/shop-category/anua-beauty.jpg" alt="Beauty" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mt-6">
              <img src="/shop-category/bridal-robe-fashion.avif" alt="Fashion" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* What We Sell */}
      <section className="py-12 px-4 bg-black text-white">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Everything You Need</p>
          <h2 className="text-2xl md:text-3xl font-extrabold">What We Sell</h2>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Hair Extensions',  cat: 'Hair Extensions' },
            { label: 'Wigs',             cat: 'Wigs' },
            { label: 'Braiding & Tools', cat: 'Braiding & Tools' },
            { label: 'Beauty & Skincare',cat: 'Beauty & Skincare' },
            { label: 'Health & Wellness',cat: 'Health & Wellness' },
            { label: 'Fashion & Clothing',cat:'Fashion' },
            { label: 'Accessories',      cat: 'Accessories' },
            { label: 'Mannequins & Stands',cat:'Mannequins & Stands' },
            { label: 'Gadgets & Tech',   cat: 'Accessories' },
            { label: 'Home & Lifestyle', cat: 'All' },
          ].map((c, i) => (
            <Link key={i} to={c.cat === 'All' ? '/shop' : `/shop?category=${encodeURIComponent(c.cat)}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-[#FDC700]/20 hover:border-[#FDC700] transition-all">
              <p className="text-sm font-bold text-white">{c.label}</p>
              <p className="text-xs text-[#FDC700] mt-1">Shop →</p>
            </Link>
          ))}
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
            { value: '5★',  label: 'Average Rating' },
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
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Training & Consultation</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">We run professional training sessions and offer expert consultations to help you grow — whether you want to improve your skills or start your own business.</p>
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