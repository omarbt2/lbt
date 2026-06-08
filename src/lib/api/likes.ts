import { supabase } from '../supabase';

export async function likePost(postId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  } catch (err) {
    console.error('likePost insert error:', err);
    throw err;
  }

  const { data } = await supabase
    .from('posts').select('likes_count').eq('id', postId).maybeSingle();
  return data?.likes_count ?? 0;
}

export async function unlikePost(postId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    await supabase.from('likes')
      .delete().eq('post_id', postId).eq('user_id', user.id);
  } catch (err) {
    console.error('unlikePost delete error:', err);
    throw err;
  }

  const { data } = await supabase
    .from('posts').select('likes_count').eq('id', postId).maybeSingle();
  return data?.likes_count ?? 0;
}

export async function isLiked(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  return !!data;
}

export async function savePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  try {
    await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
  } catch (err) {
    console.error('savePost error:', err);
    throw err;
  }
}

export async function unsavePost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  try {
    await supabase.from('saved_posts')
      .delete().eq('post_id', postId).eq('user_id', user.id);
  } catch (err) {
    console.error('unsavePost error:', err);
    throw err;
  }
}
