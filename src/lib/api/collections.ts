import { supabase } from '../supabase';
import { Post } from '../../types';
import { mapProfileToUser } from '../../store/authStore';
import { formatTimeLabel } from './posts';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  is_private: boolean;
  posts_count: number;
  created_at: string;
}

export async function getCollections(): Promise<Collection[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await (supabase as any)
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Collection[];
}

export async function createCollection(name: string): Promise<Collection> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await (supabase as any)
    .from('collections')
    .insert({ user_id: user.id, name, posts_count: 0 })
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Failed to create collection');
  return data as Collection;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await (supabase as any).from('collections').delete().eq('id', id);
  if (error) throw error;
}

export async function getSavedPostsByCollection(collectionId: string | null): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = (supabase as any)
    .from('saved_posts')
    .select('post_id, collection_id, posts(*, profiles(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (collectionId === null) {
    query = query.is('collection_id', null);
  } else {
    query = query.eq('collection_id', collectionId);
  }

  const { data } = await query;
  if (!data) return [];

  return data
    .filter((b: any) => b.posts)
    .map((b: any) => {
      const p = b.posts as any;
      return {
        id: p.id,
        user: mapProfileToUser(p.profiles),
        caption: p.caption,
        category: p.category || 'General',
        timeLabel: formatTimeLabel(p.created_at),
        imageUrl: p.media_urls?.[0],
        carouselImages: p.media_urls,
        likes: p.likes_count,
        commentsCount: p.comments_count,
        hasLiked: false,
        hasBookmarked: true,
        tags: p.tags || [],
        commentsList: [],
      } as Post;
    });
}

export async function movePostToCollection(postId: string, collectionId: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await (supabase as any)
    .from('saved_posts')
    .update({ collection_id: collectionId })
    .eq('post_id', postId)
    .eq('user_id', user.id);
  if (error) throw error;
}
