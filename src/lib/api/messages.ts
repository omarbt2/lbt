import { supabase } from '../supabase';
import { Chat, Message, MessageReaction } from '../../types';
import { mapProfileToUser } from '../../store/authStore';
import { formatTimeLabel } from './posts';

export async function getOrCreateConversation(targetUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant1.eq.${user.id},participant2.eq.${targetUserId}),` +
      `and(participant1.eq.${targetUserId},participant2.eq.${user.id}),` +
      `and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),` +
      `and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      participant1: user.id,
      participant2: targetUserId,
      user1_id: user.id,
      user2_id: targetUserId,
    })
    .select('id')
    .single();

  if (error || !created) throw error || new Error('Failed to create conversation');
  return created.id;
}

export const getOrCreateChat = getOrCreateConversation;

function mapRowToMessage(m: any): Message {
  const senderProfile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return {
    id: m.id,
    senderId: m.sender_id,
    senderName: senderProfile?.display_name || senderProfile?.full_name || m.profiles?.display_name || 'Anonymous',
    text: m.content || undefined,
    imageUrl: m.media_url || undefined,
    voice_url: m.voice_url || undefined,
    voice_duration_seconds: m.voice_duration || undefined,
    message_type: m.message_type || 'text',
    gif_url: m.gif_url || undefined,
    gif_preview: m.gif_preview || undefined,
    isRead: m.is_read || false,
    is_seen: m.is_seen || false,
    reply_to_id: m.reply_to_id || undefined,
    reply_to: m.reply_to ? mapRowToMessage(m.reply_to) : undefined,
    reactions_count: m.reactions_count || 0,
    reactions: m.reactions || [],
    timeLabel: formatTimeLabel(m.created_at),
  };
}

export async function getConversationMessages(
  conversationId: string,
  page = 0,
  pageSize = 50
): Promise<Message[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:sender_id(*),
      reply_to:reply_to_id(id, content, sender_id, profiles:sender_id(display_name, full_name)),
      reactions:message_reactions(id, message_id, user_id, emoji, created_at)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) return [];
  return data.reverse().map(mapRowToMessage);
}

export const getChatMessages = getConversationMessages;

export async function markMessagesAsSeen(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('messages')
    .update({ is_seen: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_seen', false);
}

export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false);
}

export async function getChats(): Promise<Chat[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: convData, error: convError } = await supabase
    .from('conversations')
    .select(`
      id, participant1, participant2, user1_id, user2_id, updated_at,
      p1_profile:participant1(id, username, display_name, full_name, avatar_url, bio),
      p2_profile:participant2(id, username, display_name, full_name, avatar_url, bio),
      u1_profile:user1_id(id, username, display_name, full_name, avatar_url, bio),
      u2_profile:user2_id(id, username, display_name, full_name, avatar_url, bio)
    `)
    .or(`participant1.eq.${user.id},participant2.eq.${user.id},user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (convError || !convData || convData.length === 0) return [];

  const { data: lastMsgs } = await supabase.rpc('get_last_messages', {
    conv_ids: convData.map((c: any) => c.id),
  });

  const lastMsgByConv = new Map<string, any>();
  if (lastMsgs) {
    for (const m of lastMsgs) {
      lastMsgByConv.set(m.conversation_id, m);
    }
  }

  return convData.map((conv: any) => {
    const normalizeProfile = (p: any) => Array.isArray(p) ? p[0] : p;
    const profiles = [
      normalizeProfile(conv.p1_profile),
      normalizeProfile(conv.p2_profile),
      normalizeProfile(conv.u1_profile),
      normalizeProfile(conv.u2_profile),
    ].filter(Boolean);
    const otherProfile = profiles.find((p: any) => p.id !== user.id) || profiles[0] || null;

    const lastMsg = lastMsgByConv.get(conv.id);
    const unreadCount = lastMsg && lastMsg.sender_id !== user.id && !lastMsg.is_read ? 1 : 0;

    return {
      id: conv.id,
      user: mapProfileToUser(otherProfile as any),
      unreadCount,
      messages: [],
    };
  });
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: { mediaUrl?: string; messageType?: string; voiceUrl?: string; voiceDuration?: number; replyToId?: string; expiresAt?: string; gifUrl?: string; gifPreview?: string }
): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertData: Record<string, any> = {
    conversation_id: conversationId,
    sender_id: user.id,
    content: options?.messageType === 'voice' ? '[Voice Message]' : (options?.messageType === 'gif' ? null : (content || null)),
    is_read: false,
    is_seen: false,
    message_type: options?.messageType || 'text',
  };

  if (options?.mediaUrl) insertData.media_url = options.mediaUrl;
  if (options?.voiceUrl) insertData.voice_url = options.voiceUrl;
  if (options?.voiceDuration != null) insertData.voice_duration = options.voiceDuration;
  if (options?.replyToId) insertData.reply_to_id = options.replyToId;
  if (options?.expiresAt) insertData.expires_at = options.expiresAt;
  if (options?.gifUrl) insertData.gif_url = options.gifUrl;
  if (options?.gifPreview) insertData.gif_preview = options.gifPreview;

  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
    .select(`
      *,
      profiles:sender_id(*),
      reply_to:reply_to_id(id, content, sender_id, profiles:sender_id(display_name, full_name))
    `)
    .single();

  if (error || !data) {
    // Join failed — fetch the inserted row without joins
    const { data: plain } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plain) throw error || new Error('Failed to send message');
    return mapRowToMessage(plain);
  }

  return mapRowToMessage(data);
}

export async function addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('message_reactions')
    .upsert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    }, { onConflict: 'message_id,user_id' })
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to add reaction');

  const { count } = await supabase
    .from('message_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('message_id', messageId);

  await supabase
    .from('messages')
    .update({ reactions_count: count || 0 })
    .eq('id', messageId);

  return data as MessageReaction;
}

export async function removeReaction(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id);

  const { count } = await supabase
    .from('message_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('message_id', messageId);

  await supabase
    .from('messages')
    .update({ reactions_count: count || 0 })
    .eq('id', messageId);
}

export async function upsertTypingIndicator(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('typing_indicators')
    .upsert({
      user_id: user.id,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,conversation_id' });
}

export async function removeTypingIndicator(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('typing_indicators')
    .delete()
    .eq('user_id', user.id)
    .eq('conversation_id', conversationId);
}


