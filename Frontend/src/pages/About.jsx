import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Globe, Users, Sparkles, Truck } from 'lucide-react';
import SEO from '../components/SEO';

const values = [
  {
    icon: <Award size={24} />,
    title: 'Curated Selection',
    desc: 'We bring together quality products across multiple categories so customers can shop confidently from one trusted store.',
  },
  {
    icon: <Heart size={24} />,
    title: 'Customer Convenience',
    desc: 'From discovery to delivery, we keep the shopping experience simple, clear and reliable for everyday buyers and business customers.',
  },
  {
    icon: <Globe size={24} />,
    title: 'Reach And Access',
    desc: 'Based in Ghana, we serve customers across locations and create easier access to products, services and opportunities.',
  },
  {
    icon: <Users size={24} />,
    title: 'Growth Support',
    desc: 'Belle Kreyashon is not only about selling products. We also support people through training, consultation and business-minded opportunities.',
  },
  {
    icon: <Sparkles size={24} />,
    title: 'Trusted Partnerships',
    desc: 'We believe in collaboration and welcome partner, sponsor and vendor relationships that expand value for our audience.',
  },
  {
    icon: <Truck size={24} />,
    title: 'Reliable Fulfilment',
    desc: 'We move orders quickly and keep service practical because customers should be able to shop with confidence.',
  },
];

const categories = [
  { label: 'Hair Extensions', cat: 'Hair Extensions' },
  { label: 'Wigs', cat: 'Wigs' },
  { label: 'Hair Care', cat: 'Hair Care' },
  { label: 'Braiding & Tools', cat: 'Braiding & Tools' },
  { label: 'Beauty & Skincare', cat: 'Beauty & Skincare' },
  { label: 'Health & Wellness', cat: 'Health & Wellness' },
  { label: 'Fashion', cat: 'Fashion' },
  { label: 'Accessories', cat: 'Accessories' },
  { label: 'Mannequins & Stands', cat: 'Mannequins & Stands' },
  { label: 'All Products', cat: 'All' },
];

export default function About() {
  return (
    <div className="pt-16 min-h-screen">
      <SEO
        title="About Belle Kreyashon"
        description="Belle Kreyashon is a Ghana-based commerce and learning platform for shopping, digital products, customer access, training, consultations, sourcing support and partnership opportunities."
        url="/about"
        keywords="about Belle Kreyashon, Ghana ecommerce platform, digital products Ghana, training and consultation Ghana, trusted online store Ghana, Belle Kreyashon Accra"
      />

      {/* Hero */}
      <div className="relative bg-black text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/shop-category/hairextension.avif" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">About Belle Kreyashon</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            A growing web app for shopping, digital access, customer support, learning, sourcing and brand growth, all in one place.
          </p>
        </div>
      </div>

      {/* Story */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Who We Are</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">A full commerce, learning and customer-access platform</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Belle Kreyashon has grown beyond a regular online store into a broader web platform designed to make shopping, learning and customer support easier to access in one place. From beauty and fashion to accessories, wellness, tools and everyday essentials, we serve both individual shoppers and business-minded customers through one connected experience.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Alongside the physical shop, the platform now supports digital products, secure customer sign-in, order tracking and a protected digital library so customers can return to what they bought, manage their access and continue using the service after checkout.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We also create room for trainings, consultations, importation support, featured-brand opportunities and partnerships. Whether you are shopping for yourself, building a business, learning a new skill, sourcing products from abroad or looking for a growth-focused collaboration, Belle Kreyashon is built to move you forward.
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
          <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Shop Across Categories</p>
          <h2 className="text-2xl md:text-3xl font-extrabold">What You Can Shop</h2>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map((category, index) => (
            <Link
              key={index}
              to={category.cat === 'All' ? '/shop' : `/shop?category=${encodeURIComponent(category.cat)}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-[#FDC700]/20 hover:border-[#FDC700] transition-all"
            >
              <p className="text-sm font-bold text-white">{category.label}</p>
              <p className="text-xs text-[#FDC700] mt-1">Shop Now</p>
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
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FDC700] flex items-center justify-center mb-4 text-black">
                  {value.icon}
                </div>
                <h3 className="font-extrabold text-base mb-2">{value.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{value.desc}</p>
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
            { value: '5 Star', label: 'Customer Experience' },
          ].map((stat, index) => (
            <div key={index}>
              <div className="text-3xl md:text-4xl font-extrabold text-[#FDC700] mb-1">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Training CTA */}
      <section className="py-16 px-4 max-w-3xl mx-auto text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Beyond Products</p>
        <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Training, Consultation And Growth Support</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          We also create space for trainings, consultations and collaboration opportunities that support individuals,
          businesses and partner brands looking to grow.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/services"
            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-extrabold rounded-full hover:bg-gray-900 transition-all text-sm"
          >
            View Services <ArrowRight size={16} />
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-2 px-6 py-3 bg-[#FDC700] text-black font-extrabold rounded-full hover:bg-yellow-300 transition-all text-sm"
          >
            Shop Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
