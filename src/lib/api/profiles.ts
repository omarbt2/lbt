import { supabase } from '../supabase';
import { User, Post, Comment } from '../../types';
import { Database } from '../../types/supabase';
import { mapProfileToUser } from '../../store/authStore';
import { formatTimeLabel } from './posts';
import { getDefaultAvatar } from '../defaultAvatars';

export async function getProfile(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileToUser(data);
}

// BUG #1 FIX: explicitly save to display_name
export async function updateProfile(data: {
  display_name?: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  website?: string;
  phone?: string;
  is_private?: boolean;
}): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updatePayload: Database['public']['Tables']['profiles']['Update'] = { ...data };
  // Keep name columns in sync
  if (data.display_name) {
    updatePayload.name = data.display_name;
    updatePayload.full_name = data.display_name;
  }
  if (data.name && !data.display_name) {
    updatePayload.display_name = data.name;
    updatePayload.full_name = data.name;
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select('*')
    .maybeSingle();

  if (error || !updated) throw error || new Error('Failed to update profile');
  return mapProfileToUser(updated);
}

export async function searchProfiles(query: string): Promise<User[]> {
  if (!query || !query.trim()) return [];

  const q = query.trim();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(10);

  if (error) {
    console.error('searchProfiles error:', error.message);
    return [];
  }
  if (!data) return [];
  return data.map(mapProfileToUser);
}

// BUG #7 FIX: fetch posts scoped to a userId via RPC
export async function getProfilePosts(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user?.id || null;

  const { data, error } = await supabase.rpc('get_profile_posts' as any, {
    p_profile_id: userId,
    p_viewer_id: viewerId,
    p_limit: limit,
    p_offset: offset,
  } as any);

  if (error || !data) {
    // Fallback to direct query if RPC not available
    return getProfilePostsFallback(userId, limit, offset);
  }

  return (data as any[]).map((p: any): Post => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const resolvedName = profile?.display_name || profile?.full_name || profile?.name || profile?.username || p.display_name || p.full_name || p.name || p.username || '';
    const resolvedAvatar = profile?.avatar_url ?? p.avatar_url ?? getDefaultAvatar(userId);
    const resolvedUsername = profile?.username ?? p.username ?? '';
    const resolvedBio = profile?.bio ?? p.bio ?? '';
    return {
      id: p.id,
      user: {
        id: profile?.id ?? userId,
        name: resolvedName,
        username: resolvedUsername,
        avatar: resolvedAvatar,
        bio: resolvedBio,
        cover_url: profile?.cover_url ?? '',
        website: profile?.website ?? '',
        phone: profile?.phone ?? '',
        is_private: profile?.is_private ?? false,
        is_verified: profile?.is_verified ?? false,
        posts_count: profile?.posts_count ?? 0,
        followersCount: profile?.followers_count ?? 0,
        followingCount: profile?.following_count ?? 0,
        isFollowing: false,
      },
      caption: p.caption || '',
      category: p.category || 'General',
      timeLabel: formatTimeLabel(p.created_at),
      imageUrl: p.media_urls?.[0] || undefined,
      carouselImages: p.media_urls || undefined,
      mediaType: p.media_type || 'image',
      likes: p.likes_count ?? 0,
      commentsCount: p.comments_count ?? 0,
      hasLiked: p.has_liked ?? false,
      hasBookmarked: p.has_bookmarked ?? false,
      tags: p.tags || [],
      commentsList: [] as Comment[],
    };
  });
}

// Fallback: direct query if RPC is not deployed yet
async function getProfilePostsFallback(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Post[]> {
  const { data: postsData, error } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !postsData) return [];

  const { data: { user } } = await supabase.auth.getUser();

  let likedPostIds = new Set<string>();
  let savedPostIds = new Set<string>();

  if (user) {
    const postIds = postsData.map((p: any) => p.id);

    const { data: likesData } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (likesData) likedPostIds = new Set(likesData.map((l: any) => l.post_id));

    const { data: savedData } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (savedData) savedPostIds = new Set(savedData.map((b: any) => b.post_id));
  }

  return postsData.map((p: any): Post => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      id: p.id,
      user: mapProfileToUser(profile || { id: userId, username: '', display_name: '', avatar_url: null, bio: '' }),
      caption: p.caption,
      category: p.category || 'General',
      timeLabel: formatTimeLabel(p.created_at),
      imageUrl: p.media_urls?.[0] || undefined,
      carouselImages: p.media_urls || undefined,
      mediaType: p.media_type || 'image',
      likes: p.likes_count,
      commentsCount: p.comments_count,
      hasLiked: likedPostIds.has(p.id),
      hasBookmarked: savedPostIds.has(p.id),
      tags: p.tags || [],
      commentsList: [] as Comment[],
    };
  });
}
