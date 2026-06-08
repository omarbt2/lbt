import React, { useState, useEffect } from 'react';
import { Notification, User } from '../types';
import { Heart, MessageSquare, AtSign, UserPlus, Bell, CheckCheck, X, MessageCircle, Phone, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mapProfileToUser } from '../store/authStore';
import { formatTimeLabel } from '../lib/api/posts';
import { followUser, unfollowUser } from '../lib/api/follows';
import { acceptFollowRequest, declineFollowRequest, getPendingFollowRequests } from '../lib/api/followRequests';
import { Avatar } from './ui/Avatar';

function getNotifText(type: string): string {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'mention': return 'mentioned you in a post';
    case 'follow': return 'started following you';
    case 'message': return 'sent you a message';
    case 'story_view': return 'viewed your story';
    case 'call': return 'called you';
    case 'system': return 'sent you a system notification';
    default: return 'sent you a notification';
  }
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'like': return <Heart className="w-3.5 h-3.5 text-white fill-white" />;
    case 'comment': return <MessageSquare className="w-3 h-3 text-white" />;
    case 'mention': return <AtSign className="w-3 h-3 text-white" />;
    case 'follow': return <UserPlus className="w-3 h-3 text-white" />;
    case 'message': return <MessageCircle className="w-3 h-3 text-white" />;
    case 'story_view': return <Eye className="w-3 h-3 text-white" />;
    case 'call': return <Phone className="w-3 h-3 text-white" />;
    case 'system': return <Bell className="w-3 h-3 text-white fill-white" />;
    default: return <Bell className="w-3 h-3 text-white" />;
  }
}

function getNotifColor(type: string): string {
  switch (type) {
    case 'like': return 'bg-error';
    case 'comment': return 'bg-on-surface';
    case 'mention': return 'bg-primary';
    case 'follow': return 'bg-on-surface';
    case 'message': return 'bg-primary';
    case 'story_view': return 'bg-on-surface';
    case 'call': return 'bg-on-surface';
    case 'system': return 'bg-on-surface-variant';
    default: return 'bg-on-surface-variant';
  }
}

interface FollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profiles: any;
}

interface NotificationsViewProps {
  notifications?: Notification[];
  onMarkAllAsRead: () => void;
  onPostSelect: (postId: string) => void;
}

export default function NotificationsView({
  notifications: propNotifications,
  onMarkAllAsRead,
  onPostSelect,
}: NotificationsViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mention' | 'like' | 'follow'>('all');
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<Notification[]>(propNotifications || []);
  const [isLoading, setIsLoading] = useState(true);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data, error } = await (supabase as any).rpc('get_notifications', { p_user_id: user.id });

      if (error) {
        console.error('get_notifications RPC error:', error);
        // Fallback to direct table query
        const { data: fallbackData } = await supabase
          .from('notifications')
          .select('*, profiles:actor_id(*), posts(media_urls)')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fallbackData && fallbackData.length > 0) {
          setNotifications(fallbackData.map((n: any) => ({
            id: n.id,
            type: n.type,
            user: n.profiles ? mapProfileToUser(n.profiles) : undefined,
            post_id: n.post_id || undefined,
            postThumbnail: n.posts?.media_urls?.[0] || undefined,
            text: `${n.profiles?.display_name || n.profiles?.name || 'Someone'} ${getNotifText(n.type)}`,
            contentSnippet: n.content || undefined,
            timeLabel: formatTimeLabel(n.created_at),
            isUnread: !n.is_read,
          })));
        } else if (propNotifications) {
          setNotifications(propNotifications);
        }
      } else if (data && data.length > 0) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          type: n.type,
          user: n.actor_profile ? mapProfileToUser(n.actor_profile) : (n.profiles ? mapProfileToUser(n.profiles) : undefined),
          post_id: n.post_id || undefined,
          postThumbnail: n.post_media_url || n.posts?.media_urls?.[0] || undefined,
          text: `${n.actor_name || n.profiles?.display_name || n.profiles?.name || 'Someone'} ${getNotifText(n.type)}`,
          contentSnippet: n.content || undefined,
          timeLabel: formatTimeLabel(n.created_at),
          isUnread: !n.is_read,
        })));
      } else if (propNotifications) {
        setNotifications(propNotifications);
      }
      setIsLoading(false);
    };
    loadNotifications();

    const loadFollowRequests = async () => {
      const requests = await getPendingFollowRequests();
      setFollowRequests(requests);
    };
    loadFollowRequests();
  }, []);

  useEffect(() => {
    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notif-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as any;
            const newNotif: Notification = {
              id: n.id,
              type: n.type,
              user: n.profiles ? mapProfileToUser(n.profiles) : undefined,
              post_id: n.post_id || undefined,
              postThumbnail: undefined,
              text: `New notification: ${getNotifText(n.type)}`,
              contentSnippet: n.content || undefined,
              timeLabel: 'Just now',
              isUnread: true,
            };
            setNotifications((prev) => [newNotif, ...prev]);
          }
        )
        .subscribe();
    };
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'mention', label: 'Mentions' },
    { id: 'like', label: 'Likes' },
    { id: 'follow', label: 'Follows' },
  ];

  const handleFollowToggle = async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!n.user) return;
    const isNowFollowing = !followStates[n.id];
    setFollowStates((prev) => ({ ...prev, [n.id]: isNowFollowing }));
    try {
      if (isNowFollowing) await followUser(n.user.id);
      else await unfollowUser(n.user.id);
    } catch (err) {
      console.error('Follow toggle error:', err);
      setFollowStates((prev) => ({ ...prev, [n.id]: !isNowFollowing }));
    }
  };

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    setProcessingRequestId(requestId);
    try {
      await acceptFollowRequest(requestId, requesterId);
      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error('Accept follow request failed:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await declineFollowRequest(requestId);
      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error('Decline follow request failed:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  return (
    <div className="flex flex-col gap-6 animate-fadeIn py-4 max-w-2xl mx-auto" id="notifications_screen">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-transparent">
        <h1 className="text-xl font-bold tracking-tight text-on-surface">Notifications</h1>
        <button
          onClick={onMarkAllAsRead}
          className="text-xs font-bold text-primary hover:text-on-surface flex items-center gap-1 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" /> Mark all as read
        </button>
      </div>

      {/* FOLLOW REQUESTS SECTION */}
      {followRequests.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider px-1">Follow Requests</h3>
          {followRequests.map((req) => {
            const profile = req.profiles;
            if (!profile) return null;
            return (
              <div
                key={req.id}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3"
              >
                <Avatar
                  src={profile.avatar_url}
                  userId={profile.id}
                  name={profile.username}
                  size="lg"
                  className="w-12 h-12 border border-primary/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface">{profile.display_name || profile.full_name || profile.username}</p>
                  <p className="text-[10px] text-outline">@{profile.username}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptRequest(req.id, req.requester_id)}
                    disabled={processingRequestId === req.id}
                    className="bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-full disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {processingRequestId === req.id ? '...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    disabled={processingRequestId === req.id}
                    className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-4 py-2 rounded-full disabled:opacity-50 active:scale-95 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* FILTER BUTTONS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filters.map((flt) => (
          <button
            key={flt.id}
            onClick={() => setActiveFilter(flt.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === flt.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {flt.label}
          </button>
        ))}
      </div>

      {/* DETAILED LOG STREAM */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider px-1">Today</h3>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifs.map((n) => {
          const isFollowedBack = followStates[n.id];

          return (
            <div
              key={n.id}
              onClick={() => n.post_id && onPostSelect(n.post_id)}
              className={`glass-panel rounded-2xl p-4 flex items-start gap-3 transition-transform hover:-translate-y-0.5 cursor-pointer border shadow-sm relative ${
                n.isUnread
                  ? 'bg-primary/5 border-primary-fixed-dim/40'
                  : 'bg-surface-container-lowest border-white/60'
              }`}
            >
              {n.isUnread && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />
              )}

              <div className="relative shrink-0 w-12 h-12">
                {n.user ? (
                  <Avatar
                    src={n.user.avatar}
                    userId={n.user.id}
                    name={n.user.name}
                    size="lg"
                    className="w-full h-full border border-white/40"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-highest rounded-full flex items-center justify-center text-primary border border-white">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                )}

                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow ${getNotifColor(n.type)}`}>
                  {getNotifIcon(n.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-on-surface leading-snug">{n.text}</p>
                {n.contentSnippet && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 italic">
                    "{n.contentSnippet}"
                  </p>
                )}
                <p className="text-[10px] text-outline font-semibold mt-1">{n.timeLabel}</p>
              </div>

              {n.postThumbnail && (
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-outline-variant/30 ml-2">
                  <img src={n.postThumbnail} alt="Post preview" className="w-full h-full object-cover" />
                </div>
              )}

              {n.type === 'follow' && (
                <button
                  onClick={(e) => handleFollowToggle(n, e)}
                  className={`text-[10px] font-bold py-2 px-4 rounded-full transition-all shrink-0 ml-2 active:scale-95 ${
                    isFollowedBack
                      ? 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                      : 'bg-primary text-white hover:bg-on-primary-fixed-variant shadow-md shadow-primary/10'
                  }`}
                >
                  {isFollowedBack ? 'Following' : 'Follow Back'}
                </button>
              )}
            </div>
          );
        })}

        {!isLoading && filteredNotifs.length === 0 && (
          <div className="text-center py-16 bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30">
            <Bell className="w-10 h-10 text-outline mx-auto opacity-35 mb-2" />
            <p className="text-xs font-semibold text-on-surface-variant">Your notification stack is clear.</p>
          </div>
        )}
      </div>
    </div>
  );
}
