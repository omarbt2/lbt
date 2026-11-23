import { supabase } from '../supabase';
import { Chat, Message, MessageReaction } from '../../types';
import { mapProfileToUser } from '../../store/authStore';
import { formatTimeLabel } from './posts';

export async function getOrCreateConversation(targetUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (!targetUserId || targetUserId === user.id) throw new Error('Invalid conversation target');

  const { data, error } = await (supabase.rpc as any)('get_or_create_conversation', {
    p_other_user_id: targetUserId,
  });

  if (error || !data) throw error || new Error('Failed to create conversation');
  return data as string;
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
    expires_at: m.expires_at || null,
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
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or('message_type.is.null,message_type.neq.call')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) return [];
  return data.reverse().map(mapRowToMessage);
}

export const getChatMessages = getConversationMessages;

export async function markMessagesAsSeen(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('mark_messages_seen', {
    p_conversation_id: conversationId,
  });
  if (error) console.error('markMessagesAsSeen error:', error);
}

export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('mark_messages_read', {
    p_conversation_id: conversationId,
  });
  if (error) console.error('markMessagesAsRead error:', error);
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

  // Unread badges are counted from visible messages in MessagesPage and the
  // app shell. Avoid the legacy counter/RPC here: expired rows can remain until
  // the scheduled cleanup runs, and must never reappear as unread previews.
  return convData.map((conv: any) => {
    const normalizeProfile = (p: any) => Array.isArray(p) ? p[0] : p;
    const profiles = [
      normalizeProfile(conv.p1_profile),
      normalizeProfile(conv.p2_profile),
      normalizeProfile(conv.u1_profile),
      normalizeProfile(conv.u2_profile),
    ].filter(Boolean);
    const otherProfile = profiles.find((p: any) => p.id !== user.id) || profiles[0] || null;

    const unreadCount = 0;

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

  if (error || !data) {
    const { data: fallbackData, error: insertErr } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji })
      .select()
      .single();
    if (insertErr || !fallbackData) throw error || insertErr || new Error('Failed to add reaction');
    return fallbackData as MessageReaction;
  }

  return data as MessageReaction;
}

export async function removeReaction(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id);

  if (error) throw error;
  // The database trigger decrements reactions_count for the deleted row.
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


