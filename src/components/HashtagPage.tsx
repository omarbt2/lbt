import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HashtagPost {
  id: string;
  caption: string;
  media_urls: string[] | null;
  likes_count: number;
}

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<HashtagPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const isFetchingRef = useRef(false);
  const PAGE = 20;

  const fetchPosts = useCallback(async (currentOffset: number, append = false) => {
    if (!tag || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!append) setIsLoading(true);

    try {
      const { data, error } = await (supabase as any).rpc('get_posts_by_hashtag', {
        p_tag: tag,
        p_limit: PAGE,
        p_offset: currentOffset,
      });

      if (error) {
        const { data: fallback } = await supabase
          .from('posts')
          .select('id, caption, media_urls, likes_count')
          .contains('tags', [tag])
          .order('likes_count', { ascending: false })
          .range(currentOffset, currentOffset + PAGE - 1);
        if (fallback) {
          setPosts(prev => append ? [...prev, ...fallback] : fallback);
          setHasMore(fallback.length >= PAGE);
        }
      } else if (data) {
        setPosts(prev => append ? [...prev, ...data] : data);
        setHasMore(data.length >= PAGE);
      }
    } catch {
      const { data: fallback } = await supabase
        .from('posts')
        .select('id, caption, media_urls, likes_count')
        .contains('tags', [tag])
        .order('likes_count', { ascending: false })
        .range(currentOffset, currentOffset + PAGE - 1);
      if (fallback) {
        setPosts(prev => append ? [...prev, ...fallback] : fallback);
        setHasMore(fallback.length >= PAGE);
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [tag]);

  useEffect(() => {
    offsetRef.current = 0;
    setPosts([]);
    setHasMore(true);
    fetchPosts(0, false);
  }, [fetchPosts]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetchingRef.current) {
          const next = offsetRef.current + PAGE;
          offsetRef.current = next;
          fetchPosts(next, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, fetchPosts]);

  return (
    <div className="flex flex-col gap-4 animate-fadeIn py-4">
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface-container rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>
        <div className="flex items-center gap-1.5">
          <Hash className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-on-surface">{tag}</h1>
        </div>
        <span className="text-xs text-outline font-medium ml-1">
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          className={`ml-auto px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            isFollowing
              ? 'bg-surface-container text-on-surface-variant border border-outline-variant'
              : 'bg-primary text-white'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-surface-container animate-pulse rounded-sm" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Hash className="w-10 h-10 text-outline mx-auto opacity-30 mb-2" />
          <p className="text-sm font-semibold text-on-surface-variant">No posts with #{tag}</p>
          <p className="text-xs text-outline mt-1">Be the first to use this hashtag!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate('/post/' + post.id)}
              className="aspect-square overflow-hidden bg-surface-container-highest cursor-pointer hover:opacity-85 transition-opacity relative group"
            >
              <img
                src={post.media_urls?.[0] || ''}
                alt={post.caption || 'Post'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';
                }}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
                <span className="flex items-center gap-1 text-xs font-bold">
                  ♥ {post.likes_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <div ref={sentinelRef} className="h-4" />
      )}

      {isLoading && posts.length > 0 && (
        <div className="py-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
