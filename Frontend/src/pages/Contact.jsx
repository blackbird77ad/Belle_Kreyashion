import { useEffect, useState } from 'react';
import { MessageCircle, Phone, Facebook, MapPin, ChevronRight, Clock, Mail, Send, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import { useCustomer } from '../context/CustomerContext';
import { api } from '../hooks/useApi';
import { getAttributionSnapshot } from '../utils/attribution';
import {
  createMarketingEventId,
  getMarketingBrowserData,
  hasMarketingConsent,
  trackFormSubmission,
} from '../utils/marketing';
import { PHONE, PHONE_LOCAL, SECONDARY_PHONE, SECONDARY_PHONE_LOCAL, WHATSAPP, FACEBOOK } from '../data/contact';

const CONTACTS = [
  {
    icon: <MessageCircle size={20} />,
    label: 'WhatsApp',
    value: PHONE_LOCAL,
    href: `https://wa.me/${WHATSAPP}`,
    iconBg: '#e8f8f0',
    iconColor: '#16a34a',
  },
  {
    icon: <Phone size={20} />,
    label: 'Call Us',
    value: PHONE_LOCAL,
    href: `tel:${PHONE}`,
    iconBg: '#e8f0fb',
    iconColor: '#2563eb',
  },
  {
    icon: <Phone size={20} />,
    label: 'Alternate Line',
    value: SECONDARY_PHONE_LOCAL,
    href: `tel:${SECONDARY_PHONE}`,
    iconBg: '#eef2ff',
    iconColor: '#4338ca',
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
    value: 'Osu, Accra - Nationwide and international delivery',
    href: null,
    iconBg: '#fef0f0',
    iconColor: '#dc2626',
  },
];

const INQUIRY_TYPES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'order', label: 'Order Help' },
  { value: 'digital', label: 'Digital Product Help' },
  { value: 'training', label: 'Training or Consultation' },
  { value: 'partnership', label: 'Partnership or Brand Feature' },
  { value: 'sourcing', label: 'Importation or Sourcing Support' },
];

const REPLY_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'any', label: 'Any available method' },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  inquiryType: 'general',
  preferredReply: 'email',
  subject: '',
  message: '',
};

const emailLooksValid = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export default function Contact() {
  const { customer } = useCustomer();
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customer) return;

    setForm((current) => ({
      ...current,
      name: current.name || customer.name || '',
      email: current.email || customer.email || '',
      phone: current.phone || customer.phone || '',
    }));
  }, [customer]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) return setError('Please enter your name.');
    if (!emailLooksValid(form.email)) return setError('Please enter a valid email address.');
    if (!form.message.trim() || form.message.trim().length < 10) {
      return setError('Please share a little more detail so we can help properly.');
    }

    setSending(true);
    try {
      const marketingEventId = createMarketingEventId('contact-form');
      const { data } = await api.post('/api/contact/inquiry', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        inquiryType: form.inquiryType,
        preferredReply: form.preferredReply,
        subject: form.subject.trim(),
        message: form.message.trim(),
        marketing: {
          eventId: marketingEventId,
          consent: hasMarketingConsent(),
          browserData: getMarketingBrowserData(),
          sourceAttribution: getAttributionSnapshot(),
        },
      });

      trackFormSubmission({
        formName: 'contact_inquiry',
        formType: form.inquiryType,
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        eventId: marketingEventId,
      });

      setSuccess(data?.message || 'Your message has been sent successfully.');
      setForm((current) => ({
        ...current,
        inquiryType: 'general',
        preferredReply: current.preferredReply || 'email',
        subject: '',
        message: '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'We could not send your message right now. Please try again shortly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      <SEO
        title="Contact Us"
        description="Contact Belle Kreyashon by email, WhatsApp, phone or Facebook. Send inquiries about orders, digital products, training, consultations and partnerships."
        url="/contact"
        keywords="contact Belle Kreyashon, email Belle Kreyashon, WhatsApp beauty store Ghana, Accra online store contact, digital product support Ghana"
      />

      <div className="border-b-[3px] border-[#FDC700] bg-black px-4 py-16 text-center text-white sm:py-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#FDC700]">Get In Touch</p>
        <h1 className="text-4xl font-extrabold md:text-6xl">Contact Us</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base">
          Reach Belle Kreyashon the way that works best for you. Use WhatsApp or call for quick help, or send an email inquiry if you want a fuller response.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Direct Channels</p>
              <h2 className="mt-2 text-2xl font-extrabold text-black">Talk to us directly</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                If you need a quick answer, these are the fastest ways to reach the team.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CONTACTS.map((contact, index) => {
                const cardContent = (
                  <>
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-200"
                      style={{ background: contact.iconBg }}
                    >
                      <span style={{ color: contact.iconColor }}>{contact.icon}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-gray-400">{contact.label}</p>
                      <p className="break-words text-sm font-bold text-gray-900">{contact.value}</p>
                    </div>

                    {contact.href && <ChevronRight size={16} className="shrink-0 text-gray-300 transition-colors duration-200" />}
                  </>
                );

                if (!contact.href) {
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5"
                    >
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <a
                    key={index}
                    href={contact.href}
                    target={contact.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all duration-200 hover:border-black hover:bg-black"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 group-hover:bg-[#FDC700]"
                      style={{ background: contact.iconBg }}
                    >
                      <span className="group-hover:text-black" style={{ color: contact.iconColor }}>{contact.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors duration-200 group-hover:text-gray-500">{contact.label}</p>
                      <p className="break-words text-sm font-bold text-gray-900 transition-colors duration-200 group-hover:text-white">{contact.value}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-gray-500" />
                  </a>
                );
              })}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-[#fcfbf7] p-5">
              <div className="mb-3 inline-flex items-center gap-2 text-xs text-gray-400">
                <Clock size={13} />
                <span>Fastest response window</span>
              </div>
              <p className="text-sm font-bold text-black">We typically reply within 1 hour on WhatsApp.</p>
              <p className="mt-2 text-xs text-gray-500">Monday - Sunday | 8am - 9pm</p>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4cc] text-black">
                <Mail size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Email Inquiry</p>
              <h2 className="mt-2 text-2xl font-extrabold text-black">Send us a message</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                Prefer email instead of chat? Fill this form and we will deliver your message straight to the Belle Kreyashon inbox.
              </p>
              {customer?.email && (
                <p className="mt-2 text-xs text-gray-400">
                  Signed in as {customer.name || 'customer'}{customer.email ? ` - ${customer.email}` : ''}.
                </p>
              )}
            </div>

            {success && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Full Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Email Address</span>
                  <input
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Phone or WhatsApp</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="Optional"
                    inputMode="tel"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Inquiry Type</span>
                  <select
                    value={form.inquiryType}
                    onChange={(event) => setField('inquiryType', event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {INQUIRY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Preferred Reply</span>
                  <select
                    value={form.preferredReply}
                    onChange={(event) => setField('preferredReply', event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {REPLY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Subject</span>
                  <input
                    value={form.subject}
                    onChange={(event) => setField('subject', event.target.value)}
                    placeholder="Optional subject"
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Message</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setField('message', event.target.value)}
                  placeholder="Tell us what you need help with."
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-3 text-sm outline-none focus:border-black"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-gray-400">
                  We will send a confirmation to your email after your message is submitted.
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
