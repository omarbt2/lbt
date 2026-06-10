import { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '../types';
import { getPosts, createPost, addComment } from '../lib/api/posts';
import { likePost, unlikePost, savePost, unsavePost } from '../lib/api/likes';
import { supabase } from '../lib/supabase';

const CACHE_TTL = 60_000;
const postsCache = new Map<string, { data: Post[]; timestamp: number }>();

export function usePosts(userId?: string) {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<Error | null>(null);
  const [offset, setOffset]     = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const isFetchingRef = useRef(false);
  const loadMoreDebounceRef = useRef(false);
  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  const PAGE = 8;

  const fetchItems = useCallback(async (currentOffset: number, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(!append);

    const cacheKey = `${userId ?? 'home'}-${currentOffset}`;
    const cached = postsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !append) {
      setPosts(cached.data);
      if (cached.data.length < PAGE) setHasMore(false);
      else setHasMore(true);
      setIsLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const data = await getPosts(PAGE, currentOffset, userId);
      if (data.length < PAGE) setHasMore(false);
      else setHasMore(true);
      setPosts((prev) => (append ? [...prev, ...data] : data));

      if (!append) {
        postsCache.set(cacheKey, { data, timestamp: Date.now() });
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
      initialLoadDone.current = true;
    }
  }, [userId]);

  useEffect(() => { fetchItems(0, false); }, [fetchItems]);

  // Refresh on tab focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isFetchingRef.current) {
        setOffset(0);
        setHasMore(true);
        postsCache.clear();
        fetchItems(0, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchItems]);

  const loadMore = useCallback(() => {
    if (isFetchingRef.current || isLoading || !hasMore) return;
    if (loadMoreTimerRef.current) clearTimeout(loadMoreTimerRef.current);
    loadMoreTimerRef.current = setTimeout(async () => {
      const next = offset + PAGE;
      setOffset(next);
      await fetchItems(next, true);
    }, 200);
  }, [isLoading, hasMore, offset, fetchItems]);

  const refresh = useCallback(async () => {
    setOffset(0); setHasMore(true);
    postsCache.clear();
    isFetchingRef.current = false;
    await fetchItems(0, false);
  }, [fetchItems]);

  const toggleLike = async (postId: string) => {
    let before: Post | undefined;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      before = p;
      return { ...p, hasLiked: !p.hasLiked, likes: p.hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1 };
    }));
    try {
      const realCount = before?.hasLiked
        ? await unlikePost(postId)
        : await likePost(postId);
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, likes: realCount } : p
      ));
    } catch (err) {
      console.error('toggleLike error:', err);
      if (before) setPosts((prev) => prev.map((p) => (p.id === postId ? before! : p)));
    }
  };

  const toggleBookmark = async (postId: string) => {
    let before: Post | undefined;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      before = p;
      return { ...p, hasBookmarked: !p.hasBookmarked };
    }));
    try {
      if (before?.hasBookmarked) await unsavePost(postId);
      else await savePost(postId);
    } catch (err) {
      console.error('toggleBookmark error:', err);
      if (before) setPosts((prev) => prev.map((p) => (p.id === postId ? before! : p)));
    }
  };

  const handleCreatePost = async (
    caption: string,
    category?: string,
    mediaUrls?: string[],
    tags?: string[],
    mediaType?: 'image' | 'video' | 'carousel'
  ) => {
    const newPost = await createPost({ caption, category, media_urls: mediaUrls, tags, media_type: mediaType });
    setPosts((prev) => [newPost, ...prev]);
    postsCache.clear();
    return newPost;
  };

  const handleAddComment = async (postId: string, content: string) => {
    const comment = await addComment(postId, content);
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, commentsCount: p.commentsCount + 1, commentsList: [...p.commentsList, comment] }
        : p
    ));
  };

  const handleDeletePost = async (postId: string) => {
    const { deletePost } = await import('../lib/api/posts');
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    postsCache.clear();
  };

  return { posts, isLoading, error, hasMore, loadMore, refresh, toggleLike, toggleBookmark, handleCreatePost, handleAddComment, handleDeletePost };
}
