import { supabase } from '../supabase';
import { User, Post, Comment } from '../../types';
import { Database } from '../../types/supabase';
import { mapProfileToUser } from '../../store/authStore';
import { formatTimeLabel } from './posts';
import { getDefaultAvatar } from '../defaultAvatars';

export async function getProfile(id: string): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  if (user?.id === id) {
    const { data: privateRows, error: privateError } = await (supabase.rpc as any)('get_my_profile_private_data');
    if (privateError) throw privateError;
    const privateData = Array.isArray(privateRows) ? privateRows[0] : privateRows;
    return mapProfileToUser({ ...data, ...(privateData || {}) });
  }

  return mapProfileToUser(data);
}

export async function updateProfile(data: {
  display_name?: string;
  name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  website?: string;
  phone?: string | null;
  dob?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  is_private?: boolean;
  status_emoji?: string | null;
  status_text?: string | null;
  status_expires_at?: string | null;
}): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updatePayload: Record<string, any> = {};
  const privatePayload: Record<string, string | null> = {};

  if (data.display_name !== undefined) updatePayload.display_name = data.display_name;
  if (data.username !== undefined) updatePayload.username = data.username;
  if (data.bio !== undefined) updatePayload.bio = data.bio;
  if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url;
  if (data.cover_url !== undefined) updatePayload.cover_url = data.cover_url;
  if (data.website !== undefined) updatePayload.website = data.website;
  if (data.is_private !== undefined) updatePayload.is_private = data.is_private;
  if (data.status_emoji !== undefined) updatePayload.status_emoji = data.status_emoji;
  if (data.status_text !== undefined) updatePayload.status_text = data.status_text;
  if (data.status_expires_at !== undefined) updatePayload.status_expires_at = data.status_expires_at;

  if (data.phone !== undefined) privatePayload.phone = data.phone;
  if (data.gender !== undefined) privatePayload.gender = data.gender;
  if (data.dob !== undefined) privatePayload.dob = data.dob;
  if (data.date_of_birth !== undefined) privatePayload.date_of_birth = data.date_of_birth;

  if (data.display_name || data.name) {
    updatePayload.display_name = data.display_name || data.name;
    updatePayload.full_name = data.display_name || data.name;
  }

  if (Object.keys(updatePayload).length === 0 && Object.keys(privatePayload).length === 0) {
    throw new Error('No fields to update');
  }

  if (Object.keys(privatePayload).length > 0) {
    const { error: privateError } = await (supabase.rpc as any)('update_my_profile_private_data', {
      p_payload: privatePayload,
    });
    if (privateError) throw privateError;
  }

  let updatedProfile: any;
  if (Object.keys(updatePayload).length > 0) {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select('*')
      .maybeSingle();

    if (error || !updated) throw error || new Error('Failed to update profile');
    updatedProfile = updated;
  } else {
    const { data: current, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error || !current) throw error || new Error('Failed to load profile');
    updatedProfile = current;
  }

  const { data: privateRows, error: privateReadError } = await (supabase.rpc as any)('get_my_profile_private_data');
  if (privateReadError) throw privateReadError;
  const privateData = Array.isArray(privateRows) ? privateRows[0] : privateRows;
  return mapProfileToUser({ ...updatedProfile, ...(privateData || {}) });
}

export async function searchProfiles(query: string): Promise<User[]> {
  if (!query || !query.trim()) return [];

  // BUG #3 FIX: raw user input was interpolated directly into a PostgREST
  // `.or()` filter string. Characters like `,`, `(`, `)`, `%`, and `*` have
  // special meaning in PostgREST filter syntax and could be used to inject
  // additional filter clauses (e.g. `,id.eq.<other-user-id>` or wildcard
  // abuse). We strip any character that isn't safe inside an `ilike` pattern
  // and escape PostgREST/ilike special characters before building the filter.
  const sanitized = query
    .trim()
    .slice(0, 50) // cap length defensively
    .replace(/[^\p{L}\p{N}\s_.-]/gu, ''); // allow letters, numbers, space, _, ., -

  if (!sanitized) return [];

  // Escape PostgREST filter special characters (comma, parentheses) and
  // ilike wildcards (% and _) so the value is treated as a literal substring.
  const escaped = sanitized
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/[,()]/g, '');

  const q = escaped;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, full_name, avatar_url, bio, cover_url, website, is_private, is_verified, posts_count, followers_count, following_count, status_emoji, status_text, is_online, last_seen')
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

  const { data, error } = await supabase.rpc('get_profile_posts', {
    p_profile_id: userId,
    p_viewer_id: viewerId,
    p_limit: limit,
    p_offset: offset,
  });

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
    .select('*, profiles!posts_user_id_fkey(*)')
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
