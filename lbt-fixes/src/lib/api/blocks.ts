import { supabase } from '../supabase';

export async function blockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error;

  // BUG #12 FIX: validate both IDs are well-formed UUIDs before interpolating
  // into a PostgREST `.or()` filter string. `user.id` comes from the
  // authenticated session and `blockedId` is normally a UUID from the UI,
  // but this guard prevents the pattern from becoming exploitable if a
  // malformed/crafted ID is ever passed in.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(user.id) || !UUID_RE.test(blockedId)) {
    console.error('blockUser: invalid UUID(s), skipping follow-relationship cleanup');
    return;
  }

  await supabase.from('follows')
    .delete()
    .or(`and(follower_id.eq.${user.id},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${user.id})`);
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function isBlocked(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId)
    .maybeSingle();
  return !!data;
}
