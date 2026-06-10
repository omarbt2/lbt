import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getDefaultAvatar } from '../lib/defaultAvatars';

export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage: (message: any) => void
) {
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conv_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .maybeSingle();

          let replyTo = undefined;
          if (payload.new.reply_to_id) {
            const { data: replyMsg } = await supabase
              .from('messages')
              .select('id, content, sender_id, profiles:sender_id(display_name, full_name)')
              .eq('id', payload.new.reply_to_id)
              .maybeSingle();
            if (replyMsg) {
              replyTo = {
                id: replyMsg.id,
                senderId: replyMsg.sender_id,
                senderName: (replyMsg as any).profiles?.display_name || (replyMsg as any).profiles?.full_name || 'Anonymous',
                text: replyMsg.content || undefined,
              };
            }
          }

          onNewMessage({
            id: payload.new.id,
            senderId: payload.new.sender_id,
            senderName: profile?.display_name || profile?.name || 'Anonymous',
            text: payload.new.content || undefined,
            imageUrl: payload.new.media_url || undefined,
            voice_url: payload.new.voice_url || undefined,
            voice_duration_seconds: payload.new.voice_duration || undefined,
            message_type: payload.new.message_type || 'text',
            is_read: payload.new.is_read || false,
            is_seen: payload.new.is_seen || false,
            reply_to_id: payload.new.reply_to_id || undefined,
            reply_to: replyTo,
            reactions_count: payload.new.reactions_count || 0,
            reactions: [],
            timeLabel: 'Just now',
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, onNewMessage]);
}

export function useRealtimeReactions(
  messageIds: string[],
  onReactionChange: (messageId: string, reactions: any[]) => void
) {
  useEffect(() => {
    if (!messageIds.length) return;

    const channelName = `reactions-${messageIds.join('-')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(${messageIds.join(',')})`,
        },
        async (payload) => {
          const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
          if (!messageId) return;

          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', messageId);

          onReactionChange(messageId, reactions || []);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageIds.join(','), onReactionChange]);
}

export function useRealtimeTyping(
  conversationId: string | null,
  currentUserId: string | null,
  onTypingChange: (userId: string, isTyping: boolean) => void
) {
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conv_typing_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const userId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          if (!userId || userId === currentUserId) return;

          if (payload.eventType === 'INSERT') {
            onTypingChange(userId, true);
          } else if (payload.eventType === 'DELETE') {
            onTypingChange(userId, false);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId, onTypingChange]);
}

export function useRealtimeCalls(
  userId: string | null,
  onIncomingCall: (call: any) => void
) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_calls_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const call = payload.new;
          if (call.status !== 'ringing') return;

          const { data: caller } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', call.caller_id)
            .maybeSingle();

          onIncomingCall({
            ...call,
            callerProfile: caller,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, onIncomingCall]);
}

export function useRealtimeFeed(
  userId: string | null,
  onFeedChange: () => void
) {
  const handlerRef = useRef(onFeedChange);
  handlerRef.current = onFeedChange;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`feed_changes_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => handlerRef.current()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => handlerRef.current()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => handlerRef.current()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${userId}` },
        () => handlerRef.current()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` },
        () => handlerRef.current()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}

export interface UseRealtimeSocialCallbacks {
  onPostsChange?: (payload: any) => void;
  onLikesChange?: (payload: any) => void;
  onFollowsChange?: (payload: any) => void;
}

export function useRealtimeSocial(callbacks: UseRealtimeSocialCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => callbacksRef.current.onPostsChange?.(payload)
      )
      .subscribe();

    const likesChannel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => callbacksRef.current.onLikesChange?.(payload)
      )
      .subscribe();

    const followsChannel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => callbacksRef.current.onFollowsChange?.(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, []);
}

export function useRealtimeNotifications(
  recipientId: string | null,
  onNewNotification: (notification: any) => void
) {
  const handlerRef = useRef(onNewNotification);
  handlerRef.current = onNewNotification;

  useEffect(() => {
    if (!recipientId) return;

    const channel = supabase
      .channel(`user_notifications_${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        async (payload) => {
          const { data: actor } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.actor_id)
            .maybeSingle();

          const actorName = actor?.display_name || actor?.name || 'Someone';

          const verb =
            payload.new.type === 'like'    ? 'liked your post' :
            payload.new.type === 'comment' ? 'commented on your post' :
            payload.new.type === 'follow'  ? 'started following you' :
            'sent a notification';

          handlerRef.current({
            id: payload.new.id,
            type: payload.new.type,
            user: actor ? {
              id: actor.id,
              name: actorName,
              username: actor.username,
              avatar: actor.avatar_url || getDefaultAvatar(actor.id),
            } : undefined,
            text: `${actorName} ${verb}`,
            timeLabel: 'Just now',
            isUnread: true,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [recipientId]);
}
