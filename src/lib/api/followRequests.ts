import { supabase } from '../supabase';

export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';

export async function getFollowRequestStatus(targetId: string): Promise<FollowRequestStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('follow_requests')
    .select('status')
    .eq('requester_id', user.id)
    .eq('target_id', targetId)
    .maybeSingle();

  return data?.status ?? null;
}

export async function sendFollowRequest(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follow_requests')
    .insert({ requester_id: user.id, target_id: targetId, status: 'pending' });
  if (error) throw error;

  await supabase.from('notifications').insert({
    recipient_id: targetId,
    actor_id: user.id,
    type: 'follow',
    is_read: false,
  });
}

export async function acceptFollowRequest(requestId: string, requesterId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase
    .from('follow_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  await supabase
    .from('follows')
    .insert({ follower_id: requesterId, following_id: user.id });

  await supabase.from('notifications').insert({
    recipient_id: requesterId,
    actor_id: user.id,
    type: 'follow',
    is_read: false,
  });
}

export async function declineFollowRequest(requestId: string): Promise<void> {
  await supabase
    .from('follow_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
}

export async function getPendingFollowRequests(): Promise<Array<{
  id: string;
  requester_id: string;
  created_at: string;
  profiles: any;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('follow_requests')
    .select('id, requester_id, created_at, profiles:requester_id(*)')
    .eq('target_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (data as any[]) || [];
}
