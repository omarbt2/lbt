import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, Compass, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { searchProfiles } from '../lib/api/profiles';
import { followUser, unfollowUser, isFollowing } from '../lib/api/follows';
import { User } from '../types';
import { getDefaultAvatar } from '../lib/defaultAvatars';
import { useAuthStore } from '../store/authStore';

export default function ExplorePage() {
  const navigate = useNavigate();
  const onSelectHashtag = (tag: string) => navigate('/hashtag/' + tag);
  const onPostSelect = (id: string) => navigate('/post/' + id);
  const onViewProfile = (userId: string) => navigate('/profile/' + userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('For You');
  const [exploreItems, setExploreItems] = useState<any[]>([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(true);
  const [peopleResults, setPeopleResults] = useState<(User & { isFollowingUser?: boolean })[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [peopleSearched, setPeopleSearched] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentUser } = useAuthStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos' | 'people'>('all');

  const categories = ['For You', 'All', 'Trending', 'Following'];

  const trendingHashtags = [
    { tag: 'GenerativeArt', posts: '12.4k' },
    { tag: 'FutureTech', posts: '8.1k' },
    { tag: 'MinimalSpace', posts: '22.8k' },
    { tag: 'DigitalNomad', posts: '15.9k' },
  ];

  useEffect(() => {
    const fetchExplore = async () => {
      setIsLoadingExplore(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (selectedCategory === 'For You' && user) {
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
            .select('id, caption, category, media_urls, likes_count, profiles(*)')
            .overlaps('tags', uniqueTags)
            .not('media_urls', 'is', null)
            .order('likes_count', { ascending: false })
            .limit(30);
          if (recommended) setExploreItems(recommended);
        } else {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: trending } = await supabase
            .from('posts')
            .select('id, caption, category, media_urls, likes_count, profiles(*)')
            .not('media_urls', 'is', null)
            .gte('created_at', weekAgo)
            .order('likes_count', { ascending: false })
            .limit(30);
          if (trending) setExploreItems(trending);
        }
      } else if (selectedCategory === 'Trending') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('posts')
          .select('id, caption, category, media_urls, likes_count, profiles(*)')
          .not('media_urls', 'is', null)
          .gte('created_at', weekAgo)
          .order('likes_count', { ascending: false })
          .limit(30);
        if (data) setExploreItems(data);
      } else if (selectedCategory === 'Following' && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const followingIds = following?.map((f: any) => f.following_id) ?? [];
        if (followingIds.length > 0) {
          const { data } = await supabase
            .from('posts')
            .select('id, caption, category, media_urls, likes_count, profiles(*)')
            .not('media_urls', 'is', null)
            .in('user_id', followingIds)
            .order('created_at', { ascending: false })
            .limit(30);
          if (data) setExploreItems(data);
        } else {
          setExploreItems([]);
        }
      } else {
        const { data } = await supabase
          .from('posts')
          .select('id, caption, category, media_urls, likes_count, profiles(*)')
          .not('media_urls', 'is', null)
          .order('likes_count', { ascending: false })
          .limit(20);
        if (data) setExploreItems(data);
      }
      setIsLoadingExplore(false);
    };
    fetchExplore();
  }, [selectedCategory]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length >= 2) {
      setIsSearchingPeople(true);
      setPeopleSearched(false);
      debounceRef.current = setTimeout(async () => {
        const results = await searchProfiles(searchQuery);
        const filtered = results.filter(u => u.id !== currentUser?.id);
        setPeopleResults(filtered);

        const newMap: Record<string, boolean> = {};
        for (const person of filtered) {
          newMap[person.id] = await isFollowing(person.id);
        }
        setFollowingMap(newMap);

        setIsSearchingPeople(false);
        setPeopleSearched(true);
      }, 300);
    } else {
      setPeopleResults([]);
      setIsSearchingPeople(false);
      setPeopleSearched(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, currentUser?.id]);

  const handleFollowToggle = useCallback(async (targetId: string) => {
    const currentlyFollowing = followingMap[targetId];
    setFollowingMap(prev => ({ ...prev, [targetId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await unfollowUser(targetId);
      } else {
        await followUser(targetId);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      setFollowingMap(prev => ({ ...prev, [targetId]: currentlyFollowing }));
    }
  }, [followingMap]);

  const aspectRatios = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[1/1]', 'aspect-[4/3]'];

  const filteredItems = exploreItems.filter((item) => {
    const matchesSearch =
      (item.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.profiles?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'photos') return matchesSearch && item.media_type !== 'video';
    if (activeFilter === 'videos') return matchesSearch && item.media_type === 'video';
    if (activeFilter === 'people') return false;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 animate-fadeIn py-4" id="explore_screen">
      <section className="relative">
        <label htmlFor="explore_search" className="sr-only">Search Ideas</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant">
            <Search className="w-5 h-5 group-focus-within:text-primary transition-colors" />
          </span>
          <input
            id="explore_search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low focus:bg-white text-on-surface border border-transparent focus:border-primary/20 rounded-full py-3 pl-12 pr-12 text-sm outline-none transition-all shadow-sm focus:ring-4 focus:ring-primary/20 placeholder:text-outline-variant"
            placeholder="Search for ideas, designs, creators..."
          />
          <button 
            onClick={() => setSearchQuery('Minimalist')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary/60 hover:text-primary transition-colors"
            title="AI Assisted Speak Input"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </section>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        {(['all', 'photos', 'videos', 'people'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${
              activeFilter === f
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f === 'all' ? '✦ All' : f === 'photos' ? '📷 Photos' : f === 'videos' ? '🎬 Videos' : '👤 People'}
          </button>
        ))}
      </div>

      <section className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-105'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {(searchQuery.trim().length >= 2 || activeFilter === 'people') && (
        <section className="flex flex-col gap-3">
          <h2 className="text-md font-bold tracking-tight text-on-surface flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-primary" /> People
          </h2>
          {isSearchingPeople ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container/50 rounded-xl animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-outline-variant/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-outline-variant/30 rounded w-24" />
                    <div className="h-2.5 bg-outline-variant/20 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : peopleSearched && peopleResults.length === 0 ? (
            <p className="text-xs text-outline font-medium">No people found for "{searchQuery}"</p>
          ) : peopleSearched ? (
            <div className="flex flex-col gap-2">
              {peopleResults.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 p-3 bg-surface-container-lowest/80 border border-white/45 rounded-xl"
                >
                  <img
                    src={person.avatar || getDefaultAvatar(person.id)}
                    alt={person.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{person.name}</p>
                    <p className="text-xs text-outline truncate">@{person.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProfile(person.id)}
                      className="bg-surface-container text-on-surface-variant text-xs font-bold px-3 py-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
                    >
                      View
                    </button>
                    {currentUser && (
                      <button
                        onClick={() => handleFollowToggle(person.id)}
                        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                          followingMap[person.id]
                            ? 'bg-surface-container text-on-surface-variant border border-outline-variant'
                            : 'bg-primary text-white'
                        }`}
                      >
                        {followingMap[person.id] ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-bold tracking-tight text-on-surface flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-primary" /> Trending Now
        </h2>
        <div className="flex flex-wrap gap-2">
          {trendingHashtags.map((ht) => (
            <div
              key={ht.tag}
              onClick={() => { setSearchQuery(ht.tag); onSelectHashtag(ht.tag); }}
              className="bg-surface-container-lowest/80 backdrop-blur-md border border-white/45 px-4 py-2 rounded-xl flex items-center space-x-2 cursor-pointer hover:bg-primary/5 hover:border-primary/25 transition-all text-xs shadow-sm"
            >
              <span className="text-primary font-extrabold text-[14px]">#</span>
              <span className="font-semibold text-on-surface">{ht.tag}</span>
              <span className="text-[10px] text-outline font-medium">({ht.posts})</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {isLoadingExplore ? (
          <div className="columns-2 sm:columns-3 gap-0.5 space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-surface-container animate-pulse aspect-[4/5] break-inside-avoid" />
            ))}
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 gap-0.5 space-y-0.5" id="explore_gallery">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => onPostSelect(item.id)}
                className="relative group overflow-hidden break-inside-avoid cursor-pointer"
              >
                <div className={`relative w-full overflow-hidden ${aspectRatios[idx % aspectRatios.length]}`}>
                  <img
                    src={item.media_urls?.[0]}
                    alt={item.caption || 'Post'}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <img
                        src={item.profiles?.avatar_url || getDefaultAvatar(item.profiles?.id || '')}
                        alt={item.profiles?.display_name}
                        className="w-6 h-6 rounded-full border border-white/50"
                      />
                      <span className="text-white font-semibold text-[11px] truncate">
                        {item.profiles?.display_name || 'Creator'}
                      </span>
                    </div>
                    <p className="text-white font-medium text-[11px] line-clamp-1">{item.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingExplore && filteredItems.length === 0 && (
          <div className="text-center py-12 bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant/30">
            <Compass className="w-8 h-8 text-outline mx-auto opacity-40 mb-2" />
            <p className="text-sm font-semibold text-on-surface-variant">No items found matching "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-xs text-primary font-bold mt-2 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
