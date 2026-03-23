import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Play, Calendar } from 'lucide-react';
import { useFetch, api } from '../hooks/useApi';

export default function Blog() {
  const [search, setSearch] = useState('');
  const [query,  setQuery]  = useState('');
  const [page,   setPage]   = useState(1);
  const PAGE_SIZE = 9;
  const { data: posts, loading } = useFetch(`/api/blog/public${query ? `?search=${query}` : ''}`, [query]);
  const pagedPosts   = (posts || []).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages   = Math.ceil((posts?.length || 0) / PAGE_SIZE);

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-black text-white py-16 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Tips, Tutorials & Trends</p>
        <h1 className="text-4xl md:text-5xl font-extrabold">Blog</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setQuery(search)}
              placeholder="Search posts..." className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
          </div>
          <button onClick={() => setQuery(search)} className="px-5 py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900">Search</button>
        </div>

        {loading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(6)].map((_,i) => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-video" />)}</div>}

        {!loading && posts?.length === 0 && (
          <div className="text-center py-20"><p className="text-gray-400 font-bold">No posts yet. Check back soon!</p></div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pagedPosts.map(post => (
            <Link key={post._id} to={`/blog/${post._id}`}
              className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { e.target.style.display='none'; }} />}
                {(post.mediaType === 'video' || post.mediaType === 'both') && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center"><Play size={20} className="text-white ml-0.5" /></div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {post.tags?.slice(0,2).map(t => <span key={t} className="text-xs bg-[#FDC700]/20 text-yellow-700 font-bold px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
                <h2 className="font-extrabold text-base leading-tight mb-1 line-clamp-2">{post.title}</h2>
                {post.excerpt && <p className="text-gray-400 text-xs line-clamp-2">{post.excerpt}</p>}
                <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                  <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Paginator */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => { setPage(p => Math.max(1,p-1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={page===1}
              className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">← Prev</button>
            <span className="text-sm font-bold text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => { setPage(p => Math.min(totalPages,p+1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={page===totalPages}
              className="px-4 py-2 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}