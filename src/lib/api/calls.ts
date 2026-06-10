import { supabase } from '../supabase';

export async function createCallRecord(receiverId: string, callType: 'audio' | 'video' = 'audio') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('calls')
    .insert({
      caller_id: user.id,
      callee_id: receiverId,
      receiver_id: receiverId,
      call_type: callType,
      status: 'ringing',
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateCallRecord(callId: string, status: string, duration?: number) {
  const update: any = { status };
  if (status === 'active') {
    update.started_at = new Date().toISOString();
  }
  if (status === 'ended') {
    update.ended_at = new Date().toISOString();
  }
  if (duration !== undefined) {
    update.duration_seconds = duration;
  }

  const { error } = await supabase
    .from('calls')
    .update(update)
    .eq('id', callId);

  if (error) throw error;
}

export async function getCallHistory(limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('calls')
    .select(`
      *,
      caller:caller_id(id, username, display_name, avatar_url),
      callee:callee_id(id, username, display_name, avatar_url),
      receiver:receiver_id(id, username, display_name, avatar_url)
    `)
    .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    const { data: fallback } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return (fallback ?? []) as any[];
  }
  return (data ?? []) as any[];
}
