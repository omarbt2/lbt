import { supabase } from '../supabase';
import { Post, Comment } from '../../types';
import { mapProfileToUser } from '../../store/authStore';
import { getDefaultAvatar } from '../defaultAvatars';


function resolveProfile(raw: any, fallbackUserId?: string): {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  [key: string]: any;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      id: fallbackUserId || '',
      display_name: null,
      username: fallbackUserId ? `user_${fallbackUserId.slice(0, 6)}` : 'user',
      avatar_url: null,
      bio: null,
      cover_url: null,
      website: null,
      phone: null,
      is_private: false,
      is_verified: false,
      posts_count: 0,
      followers_count: 0,
      following_count: 0,
    };
  }
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (!obj || typeof obj !== 'object') {
    return {
      id: fallbackUserId || '',
      display_name: null,
      username: fallbackUserId ? `user_${fallbackUserId.slice(0, 6)}` : 'user',
      avatar_url: null,
      bio: null,
      cover_url: null,
      website: null,
      phone: null,
      is_private: false,
      is_verified: false,
      posts_count: 0,
      followers_count: 0,
      following_count: 0,
    };
  }
  return {
    ...obj,
    id: obj.id || fallbackUserId || '',
    username: obj.username || '',
    display_name: obj.display_name || obj.full_name || obj.name || obj.username || null,
    avatar_url: obj.avatar_url || null,
    bio: obj.bio || '',
  };
}

export function formatTimeLabel(created_at: string): string {
  const date = new Date(created_at);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  if (diffSec < 60)  return 'now';
  if (diffMin < 60)  return `${diffMin}m`;
  if (diffHr  < 24)  return `${diffHr}h`;
  if (diffDay < 7)   return `${diffDay}d`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDay > 365 ? 'numeric' : undefined });
}

export async function getPosts(
  limit   = 10,
  offset  = 0,
  userId?: string
): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();

  // Home feed — use the new RPC to avoid N+1 queries
  if (!userId && user) {
    const { data, error } = await supabase
      .rpc('get_feed', { p_user_id: user.id, p_limit: limit, p_offset: offset });

    if (error) { console.error('get_feed error:', error); return []; }

    return (data || []).map((p: any): Post => {
      const profile = resolveProfile(p.profiles, p.user_id);
      return {
        id: p.id,
        user: profile
          ? {
              id: profile.id,
              name: profile.display_name || profile.username || 'Unknown',
              username: profile.username,
              avatar: profile.avatar_url
                || getDefaultAvatar(profile.id || profile.username || 'user'),
              bio: profile.bio || '',
              cover_url: profile.cover_url || '',
              website: profile.website || '',
              phone: profile.phone || '',
              is_private: profile.is_private ?? false,
              is_verified: profile.is_verified ?? false,
              posts_count: profile.posts_count ?? 0,
              followersCount: profile.followers_count ?? 0,
              followingCount: profile.following_count ?? 0,
              isFollowing: false,
            }
          : {
              id: p.user_id || '',
              name: 'Unknown',
              username: '',
              avatar: getDefaultAvatar('user'),
              bio: '',
              cover_url: '',
              website: '',
              phone: '',
              is_private: false,
              is_verified: false,
              posts_count: 0,
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
            },
        caption: p.caption,
        category: p.category || 'General',
        timeLabel: formatTimeLabel(p.created_at),
        imageUrl: p.image_url || p.media_urls?.[0] || undefined,
        carouselImages: p.media_urls || undefined,
        mediaType: (p.media_type as 'image' | 'video' | 'carousel') || 'image',
        likes: p.likes_count,
        commentsCount: p.comments_count,
        hasLiked: p.has_liked ?? false,
        hasBookmarked: p.has_bookmarked ?? false,
        tags: p.tags || [],
        commentsList: (p.comments || []).map((c: any): Comment => {
          const cProfile = resolveProfile(c.profiles || c.user_profile, c.user_id);
          return {
            id: c.id,
            user: cProfile
              ? {
                  id: cProfile.id,
                  name: cProfile.display_name || cProfile.username || 'Unknown',
                  username: cProfile.username,
                  avatar: cProfile.avatar_url
                    || getDefaultAvatar(cProfile.id || cProfile.username || 'user'),
                  bio: cProfile.bio || '',
                  cover_url: cProfile.cover_url || '',
                  website: cProfile.website || '',
                  phone: cProfile.phone || '',
                  is_private: cProfile.is_private ?? false,
                  is_verified: cProfile.is_verified ?? false,
                  posts_count: cProfile.posts_count ?? 0,
                  followersCount: cProfile.followers_count ?? 0,
                  followingCount: cProfile.following_count ?? 0,
                  isFollowing: false,
                }
              : {
                  id: c.user_id || '',
                  name: 'Unknown',
                  username: '',
              avatar: getDefaultAvatar('user'),
                  bio: '',
                  cover_url: '',
                  website: '',
                  phone: '',
                  is_private: false,
                  is_verified: false,
                  posts_count: 0,
                  followersCount: 0,
                  followingCount: 0,
                  isFollowing: false,
                },
            content: c.content,
            likes: c.likes_count,
            timeLabel: formatTimeLabel(c.created_at),
            hasLiked: false,
          };
        }),
      };
    });
  }

  // Profile feed — always explicitly join
  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles!posts_user_id_fkey (
        id, username, display_name, full_name, avatar_url, bio,
        followers_count, following_count
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);

  const { data: postsData, error } = await query;
  if (error) { console.error('getPosts error:', error); return []; }

  let likedPostIds    = new Set<string>();
  let savedPostIds    = new Set<string>();

  if (user && postsData?.length) {
    const postIds = postsData.map((p: any) => p.id);

    const { data: likesData } = await supabase
      .from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds);
    if (likesData) likedPostIds = new Set(likesData.map((l: any) => l.post_id));

    const { data: savedData } = await supabase
      .from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds);
    if (savedData) savedPostIds = new Set(savedData.map((b: any) => b.post_id));
  }

  const postIds = (postsData || []).map((p: any) => p.id);
  const { data: allComments } = await supabase
    .from('comments').select('*, profiles!comments_user_id_fkey(*)').in('post_id', postIds)
    .order('created_at', { ascending: true });

  const commentsByPost = (allComments || []).reduce((acc: any, c: any) => {
    if (!acc[c.post_id]) acc[c.post_id] = [];
    acc[c.post_id].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  return (postsData || []).map((p: any): Post => {
    const pProfile = resolveProfile(p.profiles);
    const commentsList: Comment[] = (commentsByPost[p.id] || []).map((c: any) => {
      const cProfile = resolveProfile(c.profiles);
      return {
        id: c.id,
        user: cProfile
          ? {
              id: cProfile.id,
              name: cProfile.display_name || cProfile.username || 'Unknown',
              username: cProfile.username,
              avatar: cProfile.avatar_url
                || getDefaultAvatar(cProfile.id || cProfile.username || 'user'),
              bio: cProfile.bio || '',
              cover_url: cProfile.cover_url || '',
              website: cProfile.website || '',
              phone: cProfile.phone || '',
              is_private: cProfile.is_private ?? false,
              is_verified: cProfile.is_verified ?? false,
              posts_count: cProfile.posts_count ?? 0,
              followersCount: cProfile.followers_count ?? 0,
              followingCount: cProfile.following_count ?? 0,
              isFollowing: false,
            }
          : {
              id: c.user_id || '',
              name: 'Unknown',
              username: '',
              avatar: getDefaultAvatar('user'),
              bio: '',
              cover_url: '',
              website: '',
              phone: '',
              is_private: false,
              is_verified: false,
              posts_count: 0,
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
            },
        content: c.content,
        likes: c.likes_count,
        timeLabel: formatTimeLabel(c.created_at),
        hasLiked: false,
      };
    });
    return {
      id: p.id,
      user: pProfile
        ? {
            id: pProfile.id,
            name: pProfile.display_name || pProfile.username || 'Unknown',
            username: pProfile.username,
            avatar: pProfile.avatar_url
              || getDefaultAvatar(pProfile.id || pProfile.username || 'user'),
            bio: pProfile.bio || '',
            cover_url: pProfile.cover_url || '',
            website: pProfile.website || '',
            phone: pProfile.phone || '',
            is_private: pProfile.is_private ?? false,
            is_verified: pProfile.is_verified ?? false,
            posts_count: pProfile.posts_count ?? 0,
            followersCount: pProfile.followers_count ?? 0,
            followingCount: pProfile.following_count ?? 0,
            isFollowing: false,
          }
        : {
            id: p.user_id || '',
            name: 'Unknown',
            username: '',
            avatar: getDefaultAvatar('user'),
            bio: '',
            cover_url: '',
            website: '',
            phone: '',
            is_private: false,
            is_verified: false,
            posts_count: 0,
            followersCount: 0,
            followingCount: 0,
            isFollowing: false,
          },
      caption: p.caption,
      category: p.category || 'General',
      timeLabel: formatTimeLabel(p.created_at),
      imageUrl: p.media_urls?.[0] || undefined,
      carouselImages: p.media_urls || undefined,
      mediaType: (p.media_type as 'image' | 'video' | 'carousel') || 'image',
      likes: p.likes_count,
      commentsCount: p.comments_count,
      hasLiked: likedPostIds.has(p.id),
      hasBookmarked: savedPostIds.has(p.id),
      tags: p.tags || [],
      commentsList,
    };
  });
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data: p, error } = await supabase
    .from('posts').select('*, profiles(*)').eq('id', id).maybeSingle();
  if (error || !p) return null;

  const { data: { user } } = await supabase.auth.getUser();
  let hasLiked = false, hasBookmarked = false;

  if (user) {
    const { data: l } = await supabase.from('likes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle();
    hasLiked = !!l;
    const { data: b } = await supabase.from('saved_posts').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle();
    hasBookmarked = !!b;
  }

  const { data: commentsData } = await supabase
    .from('comments').select('*, profiles(*)').eq('post_id', id).order('created_at', { ascending: true });

  const pProfile = resolveProfile(p.profiles);
  const commentsList: Comment[] = (commentsData || []).map((c: any) => {
    const cProfile = resolveProfile(c.profiles);
    return {
      id: c.id,
      user: cProfile
        ? { id: cProfile.id, name: cProfile.display_name || cProfile.username || 'Unknown', username: cProfile.username, avatar: cProfile.avatar_url || getDefaultAvatar(cProfile.id || cProfile.username || 'user'), bio: cProfile.bio || '', cover_url: cProfile.cover_url || '', website: cProfile.website || '', phone: cProfile.phone || '', is_private: cProfile.is_private ?? false, is_verified: cProfile.is_verified ?? false, posts_count: cProfile.posts_count ?? 0, followersCount: cProfile.followers_count ?? 0, followingCount: cProfile.following_count ?? 0, isFollowing: false }
        : { id: c.user_id || '', name: 'Unknown', username: '', avatar: getDefaultAvatar('user'), bio: '', cover_url: '', website: '', phone: '', is_private: false, is_verified: false, posts_count: 0, followersCount: 0, followingCount: 0, isFollowing: false },
      content: c.content,
      likes: c.likes_count,
      timeLabel: formatTimeLabel(c.created_at),
      hasLiked: false,
    };
  });

  return {
    id: p.id,
    user: pProfile
      ? { id: pProfile.id, name: pProfile.display_name || pProfile.username || 'Unknown', username: pProfile.username, avatar: pProfile.avatar_url || getDefaultAvatar(pProfile.id || pProfile.username || 'user'), bio: pProfile.bio || '', cover_url: pProfile.cover_url || '', website: pProfile.website || '', phone: pProfile.phone || '', is_private: pProfile.is_private ?? false, is_verified: pProfile.is_verified ?? false, posts_count: pProfile.posts_count ?? 0, followersCount: pProfile.followers_count ?? 0, followingCount: pProfile.following_count ?? 0, isFollowing: false }
      : { id: p.user_id || '', name: 'Unknown', username: '', avatar: getDefaultAvatar('user'), bio: '', cover_url: '', website: '', phone: '', is_private: false, is_verified: false, posts_count: 0, followersCount: 0, followingCount: 0, isFollowing: false },
    caption: p.caption,
    category: p.category || 'General',
    timeLabel: formatTimeLabel(p.created_at),
    imageUrl: p.media_urls?.[0] || undefined,
    carouselImages: p.media_urls || undefined,
    mediaType: (p.media_type as 'image' | 'video' | 'carousel') || 'image',
    likes: p.likes_count,
    commentsCount: p.comments_count,
    hasLiked,
    hasBookmarked,
    tags: p.tags || [],
    commentsList,
  };
}

export async function createPost(postData: {
  caption: string;
  category?: string;
  media_urls?: string[];
  media_type?: 'image' | 'video' | 'carousel';
  tags?: string[];
  close_friends_only?: boolean;
  collab_user_id?: string | null;
}): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const mediaType: 'image' | 'video' | 'carousel' =
    postData.media_type
      ? postData.media_type
      : (postData.media_urls && postData.media_urls.length > 1 ? 'carousel' : 'image');

  // Strip empty/falsy URLs from media_urls to avoid issues
  const cleanMediaUrls = (postData.media_urls || []).filter(u => u && u.trim());

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      caption: postData.caption,
      category: postData.category || 'General',
      media_urls: cleanMediaUrls,
      media_type: mediaType,
      tags: postData.tags || [],
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
    } as any)
    .select('*, profiles(*)')
    .single();

  if (error) throw new Error(error.message || 'Failed to create post');
  if (!data) throw new Error('Failed to create post');

  let profile = data.profiles as any;
  if (!profile) {
    const { data: fetchedProfile } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = fetchedProfile;
  }
  if (!profile) {
    profile = {
      id: user.id,
      display_name: user.email || 'User',
      username: user.id.slice(0, 8),
      name: user.email || 'User',
      full_name: null,
      avatar_url: '',
      cover_url: null,
      bio: '',
      website: null,
      followers_count: 0,
      following_count: 0,
      phone: null,
      is_private: null,
      is_verified: null,
      posts_count: null,
      dob: null,
      gender: null,
      created_at: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    user: mapProfileToUser(profile),
    caption: data.caption,
    category: data.category || 'General',
    timeLabel: 'Just now',
    imageUrl: data.media_urls?.[0] || data.image_url || undefined,
    carouselImages: data.media_urls || undefined,
    mediaType,
    likes: 0,
    commentsCount: 0,
    hasLiked: false,
    hasBookmarked: false,
    tags: data.tags || [],
    commentsList: [],
  };
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export async function addComment(postId: string, content: string): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, content, likes_count: 0 })
    .select('*, profiles(*)')
    .single();

  if (error || !data) throw error || new Error('Failed to insert comment');

  const cProfile = resolveProfile(data.profiles);
  return {
    id: data.id,
    user: cProfile
      ? { id: cProfile.id, name: cProfile.display_name || cProfile.username || 'Unknown', username: cProfile.username, avatar: cProfile.avatar_url || getDefaultAvatar(cProfile.id || cProfile.username || 'user'), bio: cProfile.bio || '', cover_url: cProfile.cover_url || '', website: cProfile.website || '', phone: cProfile.phone || '', is_private: cProfile.is_private ?? false, is_verified: cProfile.is_verified ?? false, posts_count: cProfile.posts_count ?? 0, followersCount: cProfile.followers_count ?? 0, followingCount: cProfile.following_count ?? 0, isFollowing: false }
      : { id: data.user_id || '', name: 'Unknown', username: '', avatar: getDefaultAvatar('user'), bio: '', cover_url: '', website: '', phone: '', is_private: false, is_verified: false, posts_count: 0, followersCount: 0, followingCount: 0, isFollowing: false },
    content: data.content,
    likes: data.likes_count,
    timeLabel: 'Just now',
    hasLiked: false,
  };
}
