import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const GALLERY = [
  { src: '/gallery/1.jpg', category: 'Hair', label: 'Hair Extensions' },
  { src: '/gallery/2.jpg', category: 'Training', label: 'Training Session' },
  { src: '/gallery/3.jpg', category: 'Products', label: 'Products' },
];

export default function Gallery() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState('All');

  const categories = ['All', ...new Set(GALLERY.map(g => g.category))];
  const filtered   = filter === 'All' ? GALLERY : GALLERY.filter(g => g.category === filter);

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-black text-white py-20 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-3">Our Work</p>
        <h1 className="text-4xl md:text-6xl font-extrabold">Gallery</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap border-2 transition-all ${filter === c ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((img, i) => (
            <div key={i} onClick={() => setSelected(i)} className="aspect-square rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all bg-gray-100">
              <img src={img.src} alt={img.label} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">No images in this category yet.</div>
        )}
      </div>

      {selected !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white"><X size={28} /></button>
          <button onClick={() => setSelected(s => s > 0 ? s - 1 : filtered.length - 1)} className="absolute left-4 text-white"><ChevronLeft size={36} /></button>
          <img src={filtered[selected]?.src} alt="" className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl" />
          <button onClick={() => setSelected(s => s < filtered.length - 1 ? s + 1 : 0)} className="absolute right-4 text-white"><ChevronRight size={36} /></button>
        </div>
      )}
    </div>
  );
}