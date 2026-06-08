import { supabase } from '../supabase';
import { User } from '../../types';
import { mapProfileToUser } from '../../store/authStore';

export async function followUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetId);
  if (error) throw error;
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle();
  return !!data;
}

export async function getFollowers(userId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles:follower_id(id, username, display_name, avatar_url, bio, cover_url, website, phone, is_private, is_verified, posts_count, followers_count, following_count)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => mapProfileToUser(r.profiles)).filter(Boolean);
}

export async function getFollowing(userId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles:following_id(id, username, display_name, avatar_url, bio, cover_url, website, phone, is_private, is_verified, posts_count, followers_count, following_count)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => mapProfileToUser(r.profiles)).filter(Boolean);
}
