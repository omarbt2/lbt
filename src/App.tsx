import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense, startTransition } from 'react';
import { useNavigate, useLocation, Outlet, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Story, Notification, User } from './types';
import { OutletContextType } from './types/context';
import AetherLogo from './components/AetherLogo';
import CreatePostView from './components/CreatePostView';
import AddStoryView from './components/AddStoryView';
import StoryViewer from './components/StoryViewer';
import CallScreen from './components/CallScreen';
import IncomingCall from './components/IncomingCall';
import { useWebRTC } from './hooks/useWebRTC';
import AuthView from './components/AuthView';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import BottomSheetMenu from './components/ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './components/ui/BottomSheetMenu';
import OnboardingView from './components/OnboardingView';
import PermissionDialog from './components/ui/PermissionDialog';
import { IconEdit, IconTrash, IconFlag, IconShare, IconSave, IconArchive } from './components/ui/MenuIcons';
import { supabase } from './lib/supabase';
import { requestNotificationPermission, subscribeToPush, showLocalNotification } from './lib/notifications';
import { setNavigate } from './lib/pushNotifications';
import { getPermissionDeniedMessage } from './lib/permissions';
import { useAuthStore } from './store/authStore';
import { usePosts } from './hooks/usePosts';
import { useRealtimeNotifications } from './hooks/useRealtime';
import { getActiveStories, StoryGroup } from './lib/api/stories';
import { Avatar } from './components/ui/Avatar';
import { getDefaultAvatar } from './lib/defaultAvatars';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
const ReelsPage = lazy(() => import('./pages/ReelsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
import NotificationsPage from './pages/NotificationsPage';
import BookmarksPage from './pages/BookmarksPage';
import ProfilePage from './pages/ProfilePage';
import PostDetailPage from './pages/PostDetailPage';
import SettingsPage from './pages/SettingsPage';
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
import EditProfilePage from './pages/EditProfilePage';
import HashtagPage from './components/HashtagPage';
import CloseFriendsManager from './components/CloseFriendsManager';
import ReportModal from './components/ReportModal';
import {
  Home as HomeIcon, Compass, Plus, Film, MessageCircle, BarChart3, Bell, User as UserIcon,
  Settings as SettingsIcon, LogOut, Bookmark, Moon, Sun,
  Copy, Flag, Ban, Trash2, Edit3, ImageIcon
} from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/web/icon-192.png" alt="LBT" className="w-16 h-16 rounded-2xl" />
        <div className="w-5 h-5 border-2 border-gray-200 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  return <AuthView onLoginSuccess={() => navigate('/', { replace: true })} />;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/web/icon-192.png" alt="LBT" className="w-16 h-16 rounded-2xl" />
        <h1 className="text-2xl font-bold text-on-surface">Page Not Found</h1>
        <p className="text-outline text-sm">The page you're looking for doesn't exist.</p>
        <a href="/" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium">
          Go Home
        </a>
      </div>
    </div>
  );
}

function AppLayout() {
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
      const { supabase } = await import('./lib/supabase');
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
            avatar: n.profiles ? getDefaultAvatar(n.profiles.id) : '',
          } : undefined,
          post_id: n.post_id || undefined,
          postThumbnail: n.posts?.media_urls?.[0] || undefined,
          contentSnippet: n.content || undefined,
          text: `${n.profiles?.display_name || n.profiles?.name || 'Someone'} ${
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

  const [incomingCallData, setIncomingCallData] = useState<{
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callId: string;
    callType: string;
  } | null>(null);

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

  const [permissionDeniedType, setPermissionDeniedType] = useState<'camera' | 'microphone' | null>(null);
  const [permDialog, setPermDialog] = useState<{type: 'microphone' | 'camera' | 'notifications'; isDenied: boolean} | null>(null);

  const showPermissionDenied = useCallback((type: 'camera' | 'microphone') => {
    setPermissionDeniedType(type);
  }, []);

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [postMenuPostId, setPostMenuPostId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'user' | 'reel' | 'story' } | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isReelsPage = location.pathname === '/reels' || location.pathname.startsWith('/reels');

  // Swipe navigation between tabs
  const TAB_ORDER = ['/', '/explore', '/reels', '/messages', '/profile/me'];
  const swipeStartXRef = useRef(0);
  const swipeStartYRef = useRef(0);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0].clientX;
    swipeStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - swipeStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartYRef.current;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (Math.abs(deltaX) < 80) return;
    const currentIdx = TAB_ORDER.indexOf(location.pathname);
    if (currentIdx === -1) return;
    const nextIdx = deltaX < 0 ? Math.min(currentIdx + 1, TAB_ORDER.length - 1) : Math.max(currentIdx - 1, 0);
    if (nextIdx !== currentIdx) navigate(TAB_ORDER[nextIdx]);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setHeaderVisible(true);
        setNavVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        setHeaderVisible(false);
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        setHeaderVisible(true);
        setNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleNewNotification = useCallback((newNotif: Notification) => {
    setLiveNotifications((prev) => [newNotif, ...prev]);
    triggerToast(`${newNotif.text}`, 'info');
    showLocalNotification(
      'LBT Social',
      newNotif.text ?? 'New notification',
      newNotif.user?.avatar ?? undefined,
    );
  }, []);

  useRealtimeNotifications(
    currentUser?.id || null,
    handleNewNotification
  );

  if (!currentUser) return null;

  const handleLikeToggle = (postId: string) => {
    const p = posts.find(x => x.id === postId);
    toggleLike(postId);
    if (p && !p.hasLiked) {
      triggerToast(`Liked ${p.user.name}'s post! ❤️`);
    }
  };

  const handleBookmarkToggle = (postId: string) => {
    const p = posts.find(x => x.id === postId);
    toggleBookmark(postId);
    if (p) {
      triggerToast(p.hasBookmarked ? 'Removed from saved folders' : 'Saved to private board 🔖');
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    await handleAddComment_api(postId, content);
    triggerToast('Comment published! 💬');
  };

  const handleStoryAdded = async (_imageSrc: string) => {
    try {
      const updatedGroups = await getActiveStories();
      setStoryGroups(updatedGroups);
      triggerToast('New story published! ✨');
    } catch (err) {
      console.error(err);
      triggerToast('Story published! ✨');
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
    triggerToast('Post published successfully! 🚀');
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

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      if (currentUser?.id) {
        const { supabase } = await import('./lib/supabase');
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

  const isActive = (path: string) => location.pathname === path;

  const outletContext: OutletContextType = useMemo(() => ({
    currentUser, darkMode, toggleDarkMode, triggerToast,
    startCall: startCallWithPermissions,
    posts, postsLoading, postsError,
    isInfiniteLoading: postsLoading && posts.length > 0,
    loadMore, refresh,
    handleLikeToggle, handleBookmarkToggle, handleAddComment, handleDeletePost,
    storyGroups, liveNotifications,
    showAddStoryModal, setShowAddStoryModal,
    handleStoryAdded, handleViewStory, handleMarkAllNotificationsAsRead,
    postMenuPostId, setPostMenuPostId,
    showPermissionDenied,
  }), [
    currentUser, darkMode, toggleDarkMode, triggerToast,
    startCallWithPermissions,
    posts, postsLoading, postsError,
    loadMore, refresh,
    handleLikeToggle, handleBookmarkToggle, handleAddComment, handleDeletePost,
    storyGroups, liveNotifications,
    showAddStoryModal, setShowAddStoryModal,
    handleStoryAdded, handleViewStory, handleMarkAllNotificationsAsRead,
    postMenuPostId, setPostMenuPostId,
    showPermissionDenied,
  ]);

  return (
    <div className="min-h-screen font-sans bg-surface-container-low text-on-surface transition-colors duration-300">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 animate-slideIn border rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-semibold ${
          toast.type === 'error'
            ? 'bg-error text-on-error border-error/30'
            : 'bg-inverse-surface text-inverse-on-surface border-outline-variant/20'
        }`}>
          <span className={`font-extrabold flex items-center justify-center rounded-full w-5 h-5 ${
            toast.type === 'error'
              ? 'text-error bg-error/10'
              : 'text-primary bg-primary/10'
          }`}>
            {toast.type === 'error' ? '✕' : '✓'}
          </span>
          {toast.message}
        </div>
      )}

      {permissionDeniedType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto">
              {permissionDeniedType === 'camera' ? (
                <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-error">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 6.93z"/>
                </svg>
              )}
            </div>
            <h3 className="text-sm font-bold text-on-surface text-center">
              {getPermissionDeniedMessage(permissionDeniedType)}
            </h3>
            <p className="text-xs text-on-surface-variant text-center">
              {permissionDeniedType === 'camera'
                ? 'Camera access is needed to take photos and record stories.'
                : 'Microphone access is needed to record voice messages and make calls.'}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setPermissionDeniedType(null)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {permDialog && (
        <PermissionDialog
          type={permDialog.type}
          isOpen={true}
          isDenied={permDialog.isDenied}
          onAllow={() => {
            setPermDialog(null);
          }}
          onDeny={() => {
            setPermDialog(null);
          }}
        />
      )}

      {/* POST MENU BOTTOM SHEET */}
      {postMenuPostId && (() => {
        const menuPost = posts.find(p => p.id === postMenuPostId);
        if (!menuPost) return null;
        const isOwn = menuPost.user.id === currentUser.id;
        const menuItems: BottomSheetMenuItem[] = isOwn
          ? [
              { icon: <IconEdit />, label: 'Edit Caption', onClick: () => {
                setEditingPostId(menuPost.id);
                setEditCaption(menuPost.caption || '');
                setPostMenuPostId(null);
              }},
              { icon: <IconArchive />, label: 'Archive', onClick: async () => {
                await (supabase.from('posts') as any).update({ is_archived: true }).eq('id', menuPost.id);
                setPostMenuPostId(null);
                triggerToast('Post archived');
              }},
              { icon: <IconShare />, label: 'Copy Link', onClick: async () => {
                await navigator.clipboard.writeText(`${window.location.origin}?post=${menuPost.id}`);
                triggerToast('Link copied!');
                setPostMenuPostId(null);
              }},
              { icon: <IconTrash />, label: 'Delete Post', destructive: true, onClick: async () => {
                await handleDeletePost(menuPost.id);
                setPostMenuPostId(null);
                triggerToast('Post deleted');
              }},
            ]
          : [
              { icon: <IconSave />, label: menuPost.hasBookmarked ? 'Unsave' : 'Save Post', onClick: async () => {
                const uid = currentUser.id;
                if (menuPost.hasBookmarked) {
                  await supabase.from('saved_posts').delete().eq('post_id', menuPost.id).eq('user_id', uid);
                } else {
                  await supabase.from('saved_posts').insert({ post_id: menuPost.id, user_id: uid });
                }
                setPostMenuPostId(null);
                triggerToast(menuPost.hasBookmarked ? 'Removed from saved' : 'Saved!');
              }},
              { icon: <IconShare />, label: 'Copy Link', onClick: async () => {
                await navigator.clipboard.writeText(`${window.location.origin}?post=${menuPost.id}`);
                triggerToast('Link copied!');
                setPostMenuPostId(null);
              }},
              { icon: <IconFlag />, label: 'Report Post', onClick: () => {
                setReportTarget({ id: menuPost.id, type: 'post' });
                setShowReportModal(true);
                setPostMenuPostId(null);
              }, destructive: true },
            ];
        return (
          <BottomSheetMenu
            isOpen={true}
            onClose={() => setPostMenuPostId(null)}
            items={menuItems}
            header={{
              avatar: menuPost.user.avatar || undefined,
              name: menuPost.user.name,
              subtitle: menuPost.timeLabel,
            }}
          />
        );
      })()}

      {webrtc.callState !== 'idle' && webrtc.remoteUserId && (
        <CallScreen
          callState={webrtc.callState}
          callType={webrtc.isVideoCall ? 'video' : 'audio'}
          remoteUser={{ id: webrtc.remoteUserId, name: 'Unknown', avatar: '' }}
          isMuted={webrtc.isMuted}
          isSpeakerOn={webrtc.isSpeakerOn}
          duration={webrtc.callDuration}
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          onEndCall={webrtc.endCall}
          onToggleMute={webrtc.toggleMute}
          onToggleSpeaker={webrtc.toggleSpeaker}
          onToggleCamera={webrtc.toggleCamera}
        />
      )}

      {incomingCallData && webrtc.callState === 'idle' && (
        <IncomingCall
          callerId={incomingCallData.callerId}
          callerName={incomingCallData.callerName}
          callerAvatar={incomingCallData.callerAvatar}
          callType={incomingCallData.callType as 'audio' | 'video'}
          callId={incomingCallData.callId}
          onAccept={() => {
            webrtc.answerCall(incomingCallData.callerId, incomingCallData.callId, incomingCallData.callType as 'audio' | 'video');
            setIncomingCallData(null);
          }}
          onReject={() => {
            webrtc.rejectCall(incomingCallData.callId);
            setIncomingCallData(null);
          }}
        />
      )}

      {showAddStoryModal && (
        <AddStoryView
          onClose={() => setShowAddStoryModal(false)}
          onStoryAdded={handleStoryAdded}
        />
      )}

      {viewingStoryGroupIndex !== null && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewingStoryGroupIndex}
          currentUserId={currentUser.id}
          onClose={() => setViewingStoryGroupIndex(null)}
        />
      )}

      {showCreatePost && (
        <CreatePostView
          currentUser={currentUser}
          onPostCreated={handlePostCreated}
          onNavigateToFeed={() => setShowCreatePost(false)}
          type={createPostType}
        />
      )}

      {editingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Edit Post Caption</h3>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={4}
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-xs text-on-surface outline-none resize-none border border-outline-variant/30 focus:border-primary"
              placeholder="Write a caption..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setEditingPostId(null); setEditCaption(''); }}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditPost}
                disabled={!editCaption.trim() || isSavingEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={`fixed top-0 left-0 right-0 h-16 z-40 bg-surface-container-lowest/95 dark:bg-surface-container-low/95 backdrop-blur-md flex md:hidden items-center justify-between px-4 pb-0.5 transition-transform duration-300 ease-in-out ${!headerVisible || isReelsPage ? '-translate-y-full' : 'translate-y-0'}`}>
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <AetherLogo size="sm" />
          <span className="font-display font-extrabold text-[15px] tracking-widest text-on-surface">LBT SOCIAL</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate('/notifications')}
            className="relative p-1.5 hover:bg-surface-container rounded-full transition-all cursor-pointer text-on-surface-variant hover:text-on-surface"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {liveNotifications.some((n) => n.isUnread) && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-low"
              />
            )}
          </div>

          <div
            onClick={() => navigate('/settings')}
            className="p-1.5 hover:bg-surface-container rounded-full transition-all cursor-pointer text-on-surface-variant hover:text-on-surface"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </div>

          <img
            src={currentUser.avatar || getDefaultAvatar(currentUser.id)}
            alt="My Profile"
            onClick={() => navigate('/profile/' + currentUser.id)}
            className="w-8 h-8 rounded-full border border-outline-variant/30 object-cover cursor-pointer hover:border-primary transition-all duration-300"
          />
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto w-full relative min-h-screen">
        <aside className="hidden md:flex flex-col h-screen sticky top-0 w-16 lg:w-64 border-r border-outline-variant/20 bg-surface p-3 lg:p-6 justify-between select-none shrink-0 overflow-hidden z-30" id="desktop_sidebar">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <AetherLogo size="md" />
              <div>
                <h1 className="text-lg font-black tracking-tight text-primary">LBT</h1>
                <p className="text-[9px] font-bold text-outline uppercase tracking-wider leading-none">Studio Platform</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1 text-xs py-4">
              {[
                { path: '/', icon: <HomeIcon className="w-5 h-5 shrink-0" />, label: 'Home Feed' },
                { path: '/explore', icon: <Compass className="w-5 h-5 shrink-0" />, label: 'Explore Designs' },
                { path: '/reels', icon: <Film className="w-5 h-5 shrink-0" />, label: 'Cinematic Reels' },
                { path: '/messages', icon: <MessageCircle className="w-5 h-5 shrink-0" />, label: 'Messaging DM' },
                { path: '/insights', icon: <BarChart3 className="w-5 h-5 shrink-0" />, label: 'Insights & Graph' },
                { path: '/notifications', icon: <Bell className="w-5 h-5 shrink-0" />, label: 'Notifications', badge: liveNotifications.some((n) => n.isUnread) },
                { path: '/bookmarks', icon: <Bookmark className="w-5 h-5 shrink-0" />, label: 'Saved Posts' },
                { path: '/profile/me', icon: <UserIcon className="w-5 h-5 shrink-0" />, label: 'My Profile' },
                { path: '/settings', icon: <SettingsIcon className="w-5 h-5 shrink-0" />, label: 'Settings' },
              ].map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-2xl font-bold transition-all ${active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'} relative`}
                  >
                    {item.icon}
                    <span className="hidden lg:block text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="absolute top-3.5 right-4 w-2 h-2 rounded-full bg-error" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4 text-xs font-bold text-on-surface-variant">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all select-none"
            >
              {darkMode ? (
                <>
                  <Sun className="w-5 h-5 shrink-0" />
                  <span className="hidden lg:block text-sm">Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 shrink-0" />
                  <span className="hidden lg:block text-sm">Dark Theme</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  useAuthStore.getState().logout();
                  triggerToast('Logged Out');
                }
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl text-error hover:bg-error/5 transition-all"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm">Log out</span>
            </button>
          </div>
        </aside>

        <section className="flex-1 px-0 pb-20 pt-16 md:pt-0 md:pb-6 md:px-6 no-scrollbar" onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
          {(() => {
            const isFullWidth = location.pathname === '/reels' || location.pathname === '/explore' || location.pathname === '/messages';
            return (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                  className={isFullWidth ? 'w-full' : 'max-w-[600px] mx-auto w-full'}
                >
                  <Outlet context={outletContext} />
                </motion.div>
              </AnimatePresence>
            );
          })()}
        </section>
      </div>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 bg-surface-container-lowest dark:bg-surface-container-low backdrop-blur-xl shadow-2xl flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom)] select-none transition-transform duration-300 ease-in-out ${!navVisible || isReelsPage ? 'translate-y-full' : 'translate-y-0'}`}>
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 relative transition-all duration-200 ${
            isActive('/')
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="Home"
        >
          <HomeIcon className={`w-6 h-6 ${isActive('/') ? 'fill-primary' : ''}`} />
          {isActive('/') && (
            <motion.div
              layoutId="nav-active-dot"
              className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
        </button>

        <button
          onClick={() => navigate('/explore')}
          className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 relative transition-all duration-200 ${
            isActive('/explore')
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="Explore"
        >
          <Compass className={`w-6 h-6 ${isActive('/explore') ? 'fill-primary' : ''}`} />
          {isActive('/explore') && (
            <motion.div
              layoutId="nav-active-dot"
              className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowCreateMenu((v) => !v)}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg -mt-4 active:scale-95 transition-all duration-200"
            title="Create"
          >
            <Plus className="text-white w-7 h-7" />
          </button>

          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-surface-container-lowest dark:bg-surface-container-high rounded-2xl shadow-2xl border border-outline-variant/30 z-50 overflow-hidden min-w-[160px] py-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => {
                    setCreatePostType('post');
                    setShowCreateMenu(false);
                    setShowCreatePost(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Post
                </button>
                <button
                  onClick={() => {
                    setCreatePostType('reel');
                    setShowCreateMenu(false);
                    setShowCreatePost(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Film className="w-5 h-5 text-purple-500" />
                  Reel
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/reels')}
          className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 relative transition-all duration-200 ${
            isActive('/reels')
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="Reels"
        >
          <Film className={`w-6 h-6 ${isActive('/reels') ? 'fill-primary' : ''}`} />
          {isActive('/reels') && (
            <motion.div
              layoutId="nav-active-dot"
              className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
        </button>

        <button
          onClick={() => navigate('/messages')}
          className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 relative transition-all duration-200 ${
            isActive('/messages')
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="Messages"
        >
          <MessageCircle className={`w-6 h-6 ${isActive('/messages') ? 'fill-primary' : ''}`} />
          {isActive('/messages') && (
            <motion.div
              layoutId="nav-active-dot"
              className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
        </button>
      </nav>

      {reportTarget && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => { setShowReportModal(false); setReportTarget(null); }}
          reportedId={reportTarget.id}
          reportType={reportTarget.type}
          reporterId={currentUser.id}
        />
      )}
    </div>
  );
}

export default function App() {
  const { isLoading, initialize } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('lbt_onboarding_complete') === 'true';
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (currentUser?.id) {
      requestNotificationPermission().then((permission) => {
        if (permission === 'granted') {
          subscribeToPush(currentUser.id);
        }
      });
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && !onboardingComplete) {
      localStorage.setItem('lbt_onboarding_complete', 'true');
      setOnboardingComplete(true);
    }
  }, [currentUser?.id, onboardingComplete]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (supabase.rpc as any)('update_user_presence', { p_is_online: true });

    const handleVisibility = () => {
      (supabase.rpc as any)('update_user_presence', { p_is_online: !document.hidden });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleBeforeUnload = () => {
      (supabase.rpc as any)('update_user_presence', { p_is_online: false });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      (supabase.rpc as any)('update_user_presence', { p_is_online: false });
    };
  }, [currentUser?.id]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('lbt_onboarding_complete', 'true');
    setOnboardingComplete(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!onboardingComplete) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
          <Route path="reels" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><ReelsPage /></Suspense></ErrorBoundary>} />
          <Route path="messages" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><MessagesPage /></Suspense></ErrorBoundary>} />
          <Route path="notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
          <Route path="bookmarks" element={<ErrorBoundary><BookmarksPage /></ErrorBoundary>} />
          <Route path="profile/:id" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
          <Route path="edit-profile" element={<ErrorBoundary><EditProfilePage /></ErrorBoundary>} />
          <Route path="post/:id" element={<ErrorBoundary><PostDetailPage /></ErrorBoundary>} />
          <Route path="hashtag/:tag" element={<ErrorBoundary><HashtagPage /></ErrorBoundary>} />
          <Route path="close-friends" element={<ErrorBoundary><CloseFriendsManager /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="insights" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><InsightsPage /></Suspense></ErrorBoundary>} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
