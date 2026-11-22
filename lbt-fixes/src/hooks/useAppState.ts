import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Post, Story, Notification, User } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { usePosts } from './usePosts';
import { useRealtimeNotifications } from './useRealtime';
import { useWebRTC } from './useWebRTC';
import { getActiveStories, StoryGroup } from '../lib/api/stories';
import { getDefaultAvatar } from '../lib/defaultAvatars';
import { showLocalNotification } from '../lib/notifications';
import { setNavigate } from '../lib/pushNotifications';

export function useAppState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();

  useEffect(() => { setNavigate(navigate); }, [navigate]);

  const { posts, isLoading: postsLoading, error: postsError, hasMore, loadMore, refresh, toggleLike, toggleBookmark, handleCreatePost, handleAddComment: handleAddComment_api, handleDeletePost } = usePosts();

  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  useEffect(() => {
    if (!currentUser?.id) return;
    getActiveStories().then(setStoryGroups).catch(console.error);
  }, [currentUser?.id]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lbt_dark_mode') === 'true';
  });
  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);
  useEffect(() => {
    localStorage.setItem('lbt_dark_mode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
  const notifFetchedRef = useRef(false);
  useEffect(() => {
    if (!currentUser?.id || notifFetchedRef.current) return;
    notifFetchedRef.current = true;
    const loadInitialNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, profiles:actor_id(*), posts(media_urls)')
        .eq('recipient_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setLiveNotifications(data.map((n: any) => ({
          id: n.id,
          type: n.type,
          user: n.profiles ? {
            id: n.profiles.id,
            name: n.profiles.display_name || n.profiles.name,
            username: n.profiles.username,
            avatar: n.profiles.avatar_url || getDefaultAvatar(n.profiles.id),
          } : undefined,
          post_id: n.post_id || undefined,
          postThumbnail: n.posts?.media_urls?.[0] || undefined,
          contentSnippet: n.content || undefined,
          text: `${n.profiles?.display_name || n.profiles?.username || 'Someone'} ${
            n.type === 'like' ? 'liked your post' :
            n.type === 'comment' ? 'commented on your post' :
            n.type === 'follow' ? 'started following you' :
            n.type === 'message' ? 'sent you a message' :
            n.type === 'story_view' ? 'viewed your story' :
            n.type === 'call' ? 'called you' :
            n.type === 'system' ? 'sent you a system notification' :
            'sent you a notification'
          }`,
          timeLabel: (() => {
            const diff = Date.now() - new Date(n.created_at).getTime();
            const m = Math.floor(diff / 60000);
            const h = Math.floor(m / 60);
            const d = Math.floor(h / 24);
            if (m < 1) return 'Just now';
            if (m < 60) return `${m}m ago`;
            if (h < 24) return `${h}h ago`;
            return `${d}d ago`;
          })(),
          isUnread: !n.is_read,
        })));
      }
    };
    loadInitialNotifications();
  }, [currentUser?.id]);

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchUnread = async () => {
      const { data } = await (supabase as any).rpc('get_unread_messages_count', {
        p_user_id: currentUser.id,
      });
      setUnreadMessages((data as number) ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const [incomingCallData, setIncomingCallData] = useState<{
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callId: string;
    callType: string;
  } | null>(null);

  const showPermissionDenied = useCallback((_type: 'camera' | 'microphone') => {}, []);

  const webrtc = useWebRTC(
    currentUser?.id ?? '',
    (callerId, callId, callType) => {
      setIncomingCallData({
        callerId,
        callId,
        callType,
        callerName: 'Unknown',
        callerAvatar: '',
      });
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', callerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setIncomingCallData(prev =>
              prev && prev.callId === callId
                ? {
                    ...prev,
                    callerName: data.display_name || 'Unknown',
                    callerAvatar: data.avatar_url || getDefaultAvatar(callerId),
                  }
                : prev
            );
          }
        })
        .then(undefined, console.error);
    },
    (type) => {
      setPermDialog({ type, isDenied: false });
    }
  );

  const [permDialog, setPermDialog] = useState<{type: 'microphone' | 'camera' | 'notifications'; isDenied: boolean} | null>(null);

  const startCallWithPermissions = useCallback(async (targetUserId: string, type: 'audio' | 'video' = 'audio') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      showPermissionDenied(type === 'video' ? 'camera' : 'microphone');
      return;
    }
    return webrtc.startCall(targetUserId, type);
  }, [webrtc.startCall, showPermissionDenied]);

  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [viewingStoryGroupIndex, setViewingStoryGroupIndex] = useState<number | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'post' | 'reel'>('post');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [postMenuPostId, setPostMenuPostId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'user' | 'reel' | 'story' } | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [shareToDmPostId, setShareToDmPostId] = useState<string | null>(null);
  const [bookmarkPostId, setBookmarkPostId] = useState<string | null>(null);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [postInsights, setPostInsights] = useState<any>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostTargetPost, setRepostTargetPost] = useState<any>(null);
  const [repostCaption, setRepostCaption] = useState('');
  const [isReposting, setIsReposting] = useState(false);

  const isReelsPage = location.pathname === '/reels' || location.pathname.startsWith('/reels');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setHeaderVisible(true);
        setNavVisible(true);
      } else if (currentScrollY > lastScrollY.current + 25) {
        setHeaderVisible(false);
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY.current - 15) {
        setHeaderVisible(true);
        setNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // BUG #8 FIX: track the toast dismissal timeout so it can be cleared on
  // unmount and so a new toast doesn't get dismissed early by a stale timer
  // from a previous toast.
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const triggerToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

  const handleNewNotification = useCallback((newNotif: Notification) => {
    setLiveNotifications((prev) => [newNotif, ...prev]);
    const msg =
      newNotif.type === 'like' ? 'Someone liked your post' :
      newNotif.type === 'comment' ? 'Someone commented on your post' :
      newNotif.type === 'follow' ? 'Someone followed you' :
      `${newNotif.text}`;
    triggerToast(msg, 'info');
    showLocalNotification(
      'LBT Social',
      newNotif.text ?? 'New notification',
      newNotif.user?.avatar ?? undefined,
    );
  }, []);

  useRealtimeNotifications(currentUser?.id || null, handleNewNotification);

  const handleLikeToggle = (postId: string) => {
    const p = posts.find(x => x.id === postId);
    toggleLike(postId);
    if (p && !p.hasLiked) {
      triggerToast(`Liked ${p.user.name}'s post!`);
    }
  };

  const handleBookmarkToggle = (postId: string) => {
    const p = posts.find(x => x.id === postId);
    toggleBookmark(postId);
    if (p) {
      triggerToast(p.hasBookmarked ? 'Removed from saved' : 'Saved to bookmarks');
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    await handleAddComment_api(postId, content);
    triggerToast('Comment published!');
  };

  const handleStoryAdded = async (_imageSrc: string) => {
    try {
      const updatedGroups = await getActiveStories();
      setStoryGroups(updatedGroups);
      triggerToast('New story published!');
    } catch (err) {
      console.error(err);
      triggerToast('Story published!');
    }
  };

  const handleViewStory = (story: Story) => {
    const groupIndex = storyGroups.findIndex(g => g.user.id === story.user.id);
    if (groupIndex >= 0) {
      setViewingStoryGroupIndex(groupIndex);
    }
  };

  const handlePostCreated = async (_newPost: Post) => {
    await refresh();
    setShowCreatePost(false);
    triggerToast('Post published!');
  };

  const handleSaveEditPost = async () => {
    if (!editingPostId || !editCaption.trim()) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ caption: editCaption.trim() })
        .eq('id', editingPostId);
      if (error) throw error;
      setEditingPostId(null);
      setEditCaption('');
      await refresh();
      triggerToast('Post updated!');
    } catch (e) {
      console.error('Failed to edit post:', e);
      triggerToast('Failed to update post', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSharePost = async (postId: string) => {
    const url = `${window.location.origin}?post=${postId}`;
    if (!currentUser?.id) return;
    try {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUser.id });
    } catch (err) {
      console.error('Failed to save shared post:', err);
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this post on LBT', url });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    triggerToast('Link copied!');
  };

  const handleRepost = async () => {
    if (!repostTargetPost || !currentUser?.id) return;
    setIsReposting(true);
    try {
      const { error } = await (supabase.from('posts') as any).insert({
        user_id: currentUser.id,
        caption: repostCaption.trim() || '',
        category: 'General',
        media_urls: [],
        media_type: 'repost',
        tags: [],
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        repost_of: repostTargetPost.id,
        is_repost: true,
      });
      if (error) throw error;
      setShowRepostModal(false);
      setRepostTargetPost(null);
      setRepostCaption('');
      await refresh();
      triggerToast('Reposted!');
    } catch (e) {
      console.error('Repost failed:', e);
      triggerToast('Failed to repost', 'error');
    } finally {
      setIsReposting(false);
    }
  };

  const fetchInsights = async (postId: string) => {
    try {
      const { data } = await (supabase.rpc as any)('get_post_insights', { p_post_id: postId });
      return data;
    } catch (_) {
      return null;
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      if (currentUser?.id) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('recipient_id', currentUser.id)
          .eq('is_read', false);
      }
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
      triggerToast('Notifications cleared');
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      triggerToast('Failed to clear notifications', 'error');
    }
  };

  return {
    currentUser,
    navigate,
    location,
    posts,
    postsLoading,
    postsError,
    loadMore,
    refresh,
    storyGroups,
    darkMode,
    toggleDarkMode,
    liveNotifications,
    unreadMessages,
    incomingCallData,
    setIncomingCallData,
    webrtc,
    permDialog,
    setPermDialog,
    showPermissionDenied,
    startCallWithPermissions,
    showAddStoryModal,
    setShowAddStoryModal,
    viewingStoryGroupIndex,
    setViewingStoryGroupIndex,
    showCreatePost,
    setShowCreatePost,
    createPostType,
    setCreatePostType,
    showCreateMenu,
    setShowCreateMenu,
    showNoteInput,
    setShowNoteInput,
    toast,
    postMenuPostId,
    setPostMenuPostId,
    showReportModal,
    setShowReportModal,
    reportTarget,
    setReportTarget,
    editingPostId,
    setEditingPostId,
    editCaption,
    setEditCaption,
    isSavingEdit,
    shareToDmPostId,
    setShareToDmPostId,
    bookmarkPostId,
    setBookmarkPostId,
    headerVisible,
    navVisible,
    isOnline,
    postInsights,
    setPostInsights,
    showInsightsModal,
    setShowInsightsModal,
    showRepostModal,
    setShowRepostModal,
    repostTargetPost,
    setRepostTargetPost,
    repostCaption,
    setRepostCaption,
    isReposting,
    isReelsPage,
    triggerToast,
    handleLikeToggle,
    handleBookmarkToggle,
    handleAddComment,
    handleStoryAdded,
    handleViewStory,
    handlePostCreated,
    handleSaveEditPost,
    handleSharePost,
    handleRepost,
    handleDeletePost,
    fetchInsights,
    handleMarkAllNotificationsAsRead,
  };
}
