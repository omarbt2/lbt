import { supabase } from '../supabase';

export async function blockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await (supabase as any)
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error;

  await supabase.from('follows')
    .delete()
    .or(`and(follower_id.eq.${user.id},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${user.id})`);
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await (supabase as any)
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function isBlocked(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await (supabase as any)
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId)
    .maybeSingle();
  return !!data;
}
