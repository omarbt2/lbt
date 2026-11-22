import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, X, Compass } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { searchProfiles } from '../lib/api/profiles';
import { followUser, unfollowUser, isFollowing } from '../lib/api/follows';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';

export default function ExplorePage() {
  const navigate = useNavigate();
  const onSelectHashtag = (tag: string) => navigate('/hashtag/' + tag);
  const onPostSelect = (id: string) => navigate('/post/' + id);
  const onViewProfile = (userId: string) => navigate('/profile/' + userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [exploreItems, setExploreItems] = useState<any[]>([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(true);
  const [peopleResults, setPeopleResults] = useState<(User & { isFollowingUser?: boolean })[]>([]);
  const [postResults, setPostResults] = useState<any[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [peopleSearched, setPeopleSearched] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentUser } = useAuthStore();

  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; posts: string }[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select('tags')
          .not('tags', 'is', null)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(200);
        if (!data) return;
        const tagCounts: Record<string, number> = {};
        data.forEach((p: any) => {
          (p.tags || []).forEach((t: string) => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          });
        });
        const sorted = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({
            tag,
            posts: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count),
          }));
        setTrendingHashtags(sorted);
      } catch (_) {}
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const fetchExplore = async () => {
      setIsLoadingExplore(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: feedData, error: feedError } = await (supabase as any)
          .from('explore_feed')
          .select('*, posts(*, profiles(*))')
          .order('score', { ascending: false })
          .limit(30);

        if (!feedError && feedData && feedData.length > 0) {
          const mapped = feedData.map((item: any) => ({
            ...item.posts,
            profiles: item.posts?.profiles,
          })).filter(Boolean);
          setExploreItems(mapped);
        } else {
          const { data: likedPosts } = await supabase
            .from('likes')
            .select('post_id, posts(tags)')
            .eq('user_id', user.id)
            .limit(50);

          const interactedTags = likedPosts
            ?.flatMap((lp: any) => (lp.posts as any)?.tags ?? [])
            .filter(Boolean) ?? [];
          const uniqueTags = [...new Set(interactedTags)].slice(0, 10);

          if (uniqueTags.length > 0) {
            const { data: recommended } = await supabase
              .from('posts')
              .select('id, caption, category, media_urls, media_type, likes_count, profiles(*)')
              .overlaps('tags', uniqueTags)
              .not('media_urls', 'is', null)
              .order('likes_count', { ascending: false })
              .limit(30);
            if (recommended) setExploreItems(recommended);
          } else {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: trending } = await supabase
              .from('posts')
              .select('id, caption, category, media_urls, media_type, likes_count, profiles(*)')
              .not('media_urls', 'is', null)
              .gte('created_at', weekAgo)
              .order('likes_count', { ascending: false })
              .limit(30);
            if (trending) setExploreItems(trending);
          }
        }
      } else {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('posts')
          .select('id, caption, category, media_urls, media_type, likes_count, profiles(*)')
          .not('media_urls', 'is', null)
          .gte('created_at', weekAgo)
          .order('likes_count', { ascending: false })
          .limit(20);
        if (data) setExploreItems(data);
      }
      setIsLoadingExplore(false);
    };
    fetchExplore();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = searchQuery.trim();
    let cancelled = false;
    if (query.length >= 2) {
      setIsSearchingPeople(true);
      setPeopleSearched(false);
      debounceRef.current = setTimeout(async () => {
        const safeQuery = query.replace(/[,%()]/g, ' ').replace(/[%_]/g, '').trim().slice(0, 50);
        const tagQuery = safeQuery.startsWith('#') ? safeQuery.slice(1) : '';
        try {
          const [people, postsResponse] = await Promise.all([
            tagQuery ? Promise.resolve([] as User[]) : searchProfiles(safeQuery.replace(/^@/, '')),
            tagQuery
              ? supabase.from('posts').select('id, caption, media_urls, media_type, likes_count, created_at, profiles(id, username, display_name, avatar_url)').contains('tags', [tagQuery]).order('created_at', { ascending: false }).limit(20)
              : supabase.from('posts').select('id, caption, media_urls, media_type, likes_count, created_at, profiles(id, username, display_name, avatar_url)').ilike('caption', '%' + safeQuery + '%').order('created_at', { ascending: false }).limit(20),
          ]);
          if (cancelled) return;
          const filtered = people.filter(person => person.id !== currentUser?.id);
          setPeopleResults(filtered);
          setPostResults(postsResponse.data || []);
          const followingEntries = await Promise.all(filtered.map(async person => [person.id, await isFollowing(person.id)] as const));
          if (!cancelled) setFollowingMap(Object.fromEntries(followingEntries));
        } catch (error) {
          if (!cancelled) { console.error('Explore search failed:', error); setPeopleResults([]); setPostResults([]); }
        } finally {
          if (!cancelled) { setIsSearchingPeople(false); setPeopleSearched(true); }
        }
      }, 300);
    } else {
      setPeopleResults([]); setPostResults([]); setIsSearchingPeople(false); setPeopleSearched(false);
    }
    return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, currentUser?.id]);

  const handleFollowToggle = useCallback(async (targetId: string) => {
    setFollowingMap(prev => {
      const currentlyFollowing = prev[targetId];
      if (currentlyFollowing) {
        unfollowUser(targetId).catch(err => {
          console.error('Follow toggle error:', err);
          setFollowingMap(p => ({ ...p, [targetId]: true }));
        });
      } else {
        followUser(targetId).catch(err => {
          console.error('Follow toggle error:', err);
          setFollowingMap(p => ({ ...p, [targetId]: false }));
        });
      }
      return { ...prev, [targetId]: !currentlyFollowing };
    });
  }, []);

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="flex flex-col gap-4 animate-fadeIn pb-[calc(env(safe-area-inset-bottom)+80px)]" id="explore_screen">
      <section className="px-4 pt-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a22] text-on-surface rounded-2xl py-3 pl-12 pr-12 text-sm outline-none border border-white/5 focus:border-primary/30 transition-all placeholder:text-outline-variant"
            placeholder="Search people, posts, tags..."
            style={{ fontSize: '16px' }}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;
                recognition.onresult = (event: any) => {
                  setSearchQuery(event.results[0][0].transcript);
                };
                recognition.start();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {isSearching ? (
        <section className="flex flex-col gap-2 px-4">
          {isSearchingPeople ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#1a1a22] rounded-2xl animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-28" />
                    <div className="h-2.5 bg-white/5 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : peopleSearched && peopleResults.length === 0 && postResults.length === 0 ? (
            <div className="text-center py-12">
              <Compass className="w-8 h-8 text-outline mx-auto opacity-40 mb-2" />
              <p className="text-sm text-on-surface-variant">No matching people or posts for "{searchQuery}"</p>
            </div>
          ) : peopleSearched ? (
            <div className="flex flex-col gap-4">
              {postResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-bold text-on-surface-variant">Posts</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {postResults.map(post => (
                      <button key={post.id} onClick={() => onPostSelect(post.id)} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-container text-left">
                        {post.media_urls?.[0] ? (post.media_type === 'video' ? <video src={post.media_urls[0]} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={post.media_urls[0]} alt={post.caption || 'Post'} loading="lazy" className="h-full w-full object-cover" />) : <span className="p-3 text-xs text-on-surface line-clamp-4">{post.caption}</span>}
                        {post.media_urls?.[0] && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white line-clamp-2">{post.caption}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {peopleResults.length > 0 && <div className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-bold text-on-surface-variant">People</h3>
                {peopleResults.map((person, idx) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-3 bg-[#1a1a22] border border-white/5 rounded-2xl"
                >
                  <Avatar
                    src={person.avatar}
                    userId={person.id}
                    name={person.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{person.name}</p>
                    <p className="text-xs text-outline truncate">@{person.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProfile(person.id)}
                      className="bg-surface-container text-on-surface-variant text-xs font-bold px-3 py-1.5 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
                    >
                      View
                    </button>
                    {currentUser && (
                      <button
                        onClick={() => handleFollowToggle(person.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                          followingMap[person.id]
                            ? 'bg-surface-container text-on-surface-variant border border-outline-variant'
                            : 'bg-primary text-white'
                        }`}
                      >
                        {followingMap[person.id] ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              </div>}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {trendingHashtags.length > 0 && (
            <section className="px-4">
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((ht) => (
                  <button
                    key={ht.tag}
                    onClick={() => onSelectHashtag(ht.tag)}
                    className="bg-[#1a1a22] border border-white/5 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-primary/10 hover:border-primary/25 transition-all text-xs"
                  >
                    <span className="text-primary font-bold">#</span>
                    <span className="font-semibold text-on-surface">{ht.tag}</span>
                    <span className="text-[10px] text-outline">({ht.posts})</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            {isLoadingExplore ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 px-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-[#1a1a22] animate-pulse aspect-square" />
                ))}
              </div>
            ) : exploreItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Compass className="w-10 h-10 text-outline mx-auto opacity-30 mb-3" />
                <p className="text-sm font-semibold text-on-surface-variant">Nothing to explore yet</p>
                <p className="text-xs text-outline mt-1">Posts will appear here as people share</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 px-4" id="explore_gallery">
                {exploreItems.map((item, idx) => {
                  const isLarge = idx % 10 === 0 || idx % 10 === 5;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onPostSelect(item.id)}
                      className={`relative group overflow-hidden cursor-pointer rounded-2xl ${
                        isLarge ? 'row-span-2 aspect-[3/4]' : 'aspect-square'
                      }`}
                    >
                      <div className="relative w-full h-full overflow-hidden bg-[#1a1a22]">
                        {item.media_urls?.[0] ? (
                          <img
                            src={item.media_urls[0]}
                            alt={item.caption || ''}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <Compass className="w-8 h-8 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar
                              src={item.profiles?.avatar_url}
                              userId={item.profiles?.id || ''}
                              name={item.profiles?.display_name}
                              size="xs"
                              className="border border-white/50"
                            />
                            <span className="text-white font-semibold text-xs truncate">
                              {item.profiles?.display_name || 'Creator'}
                            </span>
                          </div>
                          <p className="text-white/90 font-medium text-xs line-clamp-1">{item.caption}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
