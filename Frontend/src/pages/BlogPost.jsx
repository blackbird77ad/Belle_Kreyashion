import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play } from 'lucide-react';
import { api } from '../hooks/useApi';

const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'));
const getYoutubeId = (url) => {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/blog/public/${id}`).then(r => { setPost(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pt-16 min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  if (!post) return <div className="pt-16 min-h-screen flex items-center justify-center"><p className="text-gray-400">Post not found. <Link to="/blog" className="underline">Back to Blog</Link></p></div>;

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/blog" className="flex items-center gap-1 text-sm text-gray-500 hover:text-black mb-6"><ChevronLeft size={18} /> Back to Blog</Link>

        {/* Cover */}
        {(post.mediaType === 'video' || post.mediaType === 'both') && post.videoUrl ? (
          <div className="aspect-video rounded-2xl overflow-hidden bg-black mb-6">
            {isYoutube(post.videoUrl) ? (
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${getYoutubeId(post.videoUrl)}`} allowFullScreen title={post.title} />
            ) : (
              <video src={post.videoUrl} controls className="w-full h-full object-cover" />
            )}
          </div>
        ) : post.coverImage ? (
          <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-6">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : null}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags?.map(t => <span key={t} className="text-xs bg-[#FDC700]/20 text-yellow-700 font-bold px-2 py-0.5 rounded-full">{t}</span>)}
        </div>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight">{post.title}</h1>
        <p className="text-xs text-gray-400 mb-6">{new Date(post.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>

        {/* Content */}
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</div>

        {/* Bottom video if both */}
        {post.mediaType === 'both' && post.videoUrl && post.coverImage && (
          <div className="mt-8 aspect-video rounded-2xl overflow-hidden bg-black">
            {isYoutube(post.videoUrl) ? (
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${getYoutubeId(post.videoUrl)}`} allowFullScreen title={post.title} />
            ) : (
              <video src={post.videoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}