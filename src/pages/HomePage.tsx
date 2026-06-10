import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { StorySkeleton, PostSkeleton } from '../components/Skeleton';
import NotesBar from '../components/NotesBar';
import { MoreVertical, Heart, MessageCircle, Bookmark, Repeat2 } from 'lucide-react';
import { QUICK_REACTIONS } from '../lib/api/emojis';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function renderCaption(caption: string, navigate: ReturnType<typeof useNavigate>) {
  if (!caption) return null;
  const parts = caption.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="text-blue-500 cursor-pointer font-semibold hover:underline"
          onClick={(e) => { e.stopPropagation(); navigate(`/hashtag/${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-blue-500 cursor-pointer font-semibold hover:underline"
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function HomePage() {
  const {
    posts, postsLoading, postsError, loadMore, refresh,
    handleLikeToggle, handleBookmarkToggle, handleAddComment, handleDeletePost,
    currentUser, storyGroups, triggerToast, setShowAddStoryModal, handleViewStory,
    postMenuPostId, setPostMenuPostId,
  } = useOutletContext<OutletContextType>();

  const sentinelRef = useRef<HTMLDivElement>(null);
  const storiesScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleStoriesMouseDown = (e: React.MouseEvent) => {
    if (!storiesScrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - storiesScrollRef.current.offsetLeft;
    scrollLeftRef.current = storiesScrollRef.current.scrollLeft;
  };

  const handleStoriesMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !storiesScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - storiesScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    storiesScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleStoriesMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: '300px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const navigate = useNavigate();

  const handleReactionLongPress = useCallback((postId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setReactionPickerPostId(postId);
    }, 500);
  }, []);

  const handleReactionPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePostReaction = useCallback(async (postId: string, emoji: string) => {
    setReactionPickerPostId(null);
    try {
      await (supabase as any).rpc('toggle_post_reaction', { p_post_id: postId, p_emoji: emoji });
      const { data } = await (supabase as any).rpc('get_post_reactions', { p_post_id: postId });
      if (data) {
        setPostReactions(prev => ({ ...prev, [postId]: data as { emoji: string; count: number; has_reacted: boolean }[] }));
      }
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }
  }, []);

  useEffect(() => {
    posts.forEach(post => {
      if (!postReactions[post.id]) {
        (supabase as any).rpc('get_post_reactions', { p_post_id: post.id })
          .then(({ data }: { data: any }) => {
            if (data) setPostReactions(prev => ({ ...prev, [post.id]: data as { emoji: string; count: number; has_reacted: boolean }[] }));
          })
          .then(undefined, () => {});
      }
    });
  }, [posts]);

  // Pull-to-refresh gesture
  const ptrStartY = useRef(0);
  const ptrActive = useRef(false);
  const [ptrDist, setPtrDist] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reactionPickerPostId, setReactionPickerPostId] = useState<string | null>(null);
  const [postReactions, setPostReactions] = useState<Record<string, { emoji: string; count: number; has_reacted: boolean }[]>>({});
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const scrollEl = document.getElementById('root');
    if (!scrollEl || scrollEl.scrollTop > 0) return;
    ptrStartY.current = e.touches[0].clientY;
    ptrActive.current = true;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!ptrActive.current) return;
    const dist = Math.max(0, Math.min(80, e.touches[0].clientY - ptrStartY.current));
    if (dist > 0) setPtrDist(dist);
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!ptrActive.current) return;
    ptrActive.current = false;
    if (ptrDist >= 60) {
      setIsRefreshing(true);
      setPtrDist(0);
      await refresh();
      setIsRefreshing(false);
    } else {
      setPtrDist(0);
    }
  }, [ptrDist, refresh]);

  useEffect(() => {
    const el = document.getElementById('root');
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn px-3 md:px-0 py-3">
      {/* Pull to refresh indicator */}
      {(ptrDist > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center py-3 transition-all"
          style={{ height: isRefreshing ? 48 : ptrDist * 0.6, opacity: isRefreshing ? 1 : ptrDist / 60 }}
        >
          {isRefreshing
            ? <div className="ptr-spinner" />
            : <div className="ptr-spinner" style={{ animationPlayState: 'paused', transform: `rotate(${ptrDist * 4}deg)` }} />
          }
        </div>
      )}

      <NotesBar />

      <section className="flex flex-col gap-3 py-4 px-1">
        <div className="flex items-center gap-3 px-1">
          <div className="h-[2px] w-5 rounded-full bg-primary/60" />
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider">Recent Stories</h3>
          <div className="flex-1 h-[2px] rounded-full bg-outline-variant/20" />
        </div>
        <div
          className="flex space-x-4 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
          ref={storiesScrollRef}
          onMouseDown={handleStoriesMouseDown}
          onMouseMove={handleStoriesMouseMove}
          onMouseUp={handleStoriesMouseUp}
          onMouseLeave={handleStoriesMouseUp}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div
            onClick={() => setShowAddStoryModal(true)}
            className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary p-[2.5px] bg-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Avatar
                  src={currentUser.avatar}
                  userId={currentUser.id}
                  name={currentUser.name}
                  size="lg"
                  className="w-full h-full border border-white dark:border-surface-container-high"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white dark:border-surface-container-high shadow-md">
                <span className="text-[11px] font-black leading-none">+</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-outline">Your Story</span>
          </div>

          {storyGroups.map((group) => (
            <div
              key={group.user.id}
              onClick={() => handleViewStory(group.stories[0])}
              className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
            >
              <div className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                group.hasUnseen
                  ? 'bg-gradient-to-tr from-primary to-primary shadow-md shadow-primary/10'
                  : 'bg-outline-variant/40'
              }`}>
                <Avatar
                  src={group.user.avatar}
                  userId={group.user.id}
                  name={group.user.name}
                  size="lg"
                  className="w-13 h-13 border-2 border-white"
                />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant w-14 truncate text-center">
                {group.user.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-6" id="home_posts_feed">
        {postsLoading && posts.length === 0 && (
          <>
            <div className="flex gap-4 overflow-x-auto">
              {[...Array(5)].map((_,i) => <StorySkeleton key={i}/>)}
            </div>
            {[...Array(3)].map((_,i) => <PostSkeleton key={i}/>)}
          </>
        )}

        {posts.map((post) => (
          <article
            key={post.id}
            className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl border border-white/55 shadow-sm overflow-hidden flex flex-col relative animate-fadeIn"
          >
            <div className="p-4 flex items-center justify-between">
              <div
                onClick={() => navigate('/profile/' + post.user.id)}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <Avatar
                  src={post.user.avatar}
                  userId={post.user.id}
                  name={post.user.name}
                  size="md"
                  className="group-hover:scale-105 transition-transform shadow-sm"
                />
                <div>
                  {(post as any).is_repost && (
                    <div className="flex items-center gap-1 text-[10px] text-primary font-bold mb-0.5">
                      <Repeat2 className="w-3 h-3" /> Reposted
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                    {post.user.name}
                  </h3>
                  <p className="hidden md:block text-[10px] text-outline font-semibold uppercase tracking-wider">
                    {post.timeLabel} • in <span className="text-primary hover:underline">{post.category}</span>
                  </p>
                  <p className="md:hidden text-[9px] text-primary dark:text-on-surface-variant font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1 font-display">
                    JUST NOW • IN {post.category.toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPostMenuPostId(post.id)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
                aria-label="Post options"
              >
                <MoreVertical className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <p className="text-xs text-on-surface font-medium leading-relaxed">{renderCaption(post.caption, navigate)}</p>
            </div>

            {post.imageUrl && (
              <div
                onClick={() => navigate('/post/' + post.id)}
                className="w-full relative aspect-square sm:aspect-[4/3] bg-surface-container cursor-pointer overflow-hidden -mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-2xl md:rounded-none group shadow-inner"
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption ? `Photo by ${post.user.name}: ${post.caption.slice(0, 50)}` : `Photo by ${post.user.name}`}
                  className="w-full h-full object-contain bg-black group-hover:scale-102 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                    View comment discussion →
                  </span>
                </div>
              </div>
            )}

              <div className="p-4 flex justify-between items-center border-t border-outline-variant/10">
              <div className="flex space-x-4">
                <div className="relative">
                  <button
                    onClick={() => handleLikeToggle(post.id)}
                    onMouseDown={() => handleReactionLongPress(post.id)}
                    onMouseUp={handleReactionPressEnd}
                    onMouseLeave={handleReactionPressEnd}
                    onTouchStart={() => handleReactionLongPress(post.id)}
                    onTouchEnd={handleReactionPressEnd}
                    className="flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors group"
                    aria-label={post.hasLiked ? 'Unlike post' : 'Like post'}
                  >
                    <Heart
                      className={`w-5 h-5 group-hover:scale-110 transition-transform duration-150 ${
                        post.hasLiked ? 'text-error fill-error like-pop' : ''
                      }`}
                    />
                    <span className="text-xs font-bold">{post.likes}</span>
                  </button>

                  {reactionPickerPostId === post.id && (
                    <div className="absolute -top-12 left-0 z-30 flex gap-0.5 bg-white/95 dark:bg-surface-container-high backdrop-blur-md rounded-full px-2 py-1.5 shadow-xl border border-outline-variant/30">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handlePostReaction(post.id, emoji); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:bg-surface-container hover:scale-125 transition-all active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/post/' + post.id)}
                  className="flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors"
                  aria-label={`View ${post.commentsCount} comments`}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-bold">{post.commentsCount}</span>
                </button>
              </div>

              <button
                onClick={() => handleBookmarkToggle(post.id)}
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label={post.hasBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                <Bookmark
                   className={`w-5 h-5 ${post.hasBookmarked ? 'text-on-surface fill-on-surface' : ''}`}
                />
              </button>

              <button
                onClick={async () => {
                  if (!currentUser?.id) return;
                  try {
                    await (supabase.from('post_shares') as any).insert({
                      user_id: currentUser.id,
                      post_id: post.id,
                      share_type: 'repost'
                    });
                    triggerToast('Reposted!');
                  } catch (_) {}
                }}
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Repost post"
              >
                <Repeat2 className="w-5 h-5" />
              </button>
            </div>

            {postReactions[post.id] && postReactions[post.id].length > 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {postReactions[post.id].map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => handlePostReaction(post.id, r.emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                      r.has_reacted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant text-outline hover:border-primary/50'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-bold">{r.count}</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}

        {postsLoading && posts.length > 0 && (
          <div className="py-6 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Loading more</span>
          </div>
        )}

        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

        {postsError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm font-semibold text-error">Failed to load posts</p>
            <button
              onClick={() => refresh()}
              className="text-xs font-bold text-primary underline hover:opacity-80"
            >
              Try again
            </button>
          </div>
        )}

        {!postsLoading && !postsError && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="text-sm font-semibold text-on-surface-variant">No posts yet.</p>
            <p className="text-xs text-outline">Be the first to share something! 🚀</p>
          </div>
        )}
      </div>
    </div>
  );
}
