import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { OutletContextType } from './types/context';
import { useAppState } from './hooks/useAppState';
import AuthView from './components/AuthView';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import BottomSheetMenu from './components/ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './components/ui/BottomSheetMenu';
import OnboardingView from './components/OnboardingView';
import { IconEdit, IconTrash, IconFlag, IconShare, IconSave, IconArchive } from './components/ui/MenuIcons';
import { supabase } from './lib/supabase';
import { requestNotificationPermission, subscribeToPush } from './lib/notifications';
import { I18nProvider } from './lib/i18n/context';
import { useAuthStore } from './store/authStore';
import Toast from './components/layout/Toast';
import MobileHeader from './components/layout/MobileHeader';
import MobileNav from './components/layout/MobileNav';
import EditPostModal from './components/layout/EditPostModal';
import InsightsModal from './components/layout/InsightsModal';
import NoteInputModal from './components/layout/NoteInputModal';
import PermissionDeniedDialog from './components/layout/PermissionDeniedDialog';
import ShareToDmModal from './components/layout/ShareToDmModal';
import BookmarkCollectionsModal from './components/layout/BookmarkCollectionsModal';
import CreatePostView from './components/CreatePostView';
import AddStoryView from './components/AddStoryView';
import StoryViewer from './components/StoryViewer';
import ReportModal from './components/ReportModal';
import { BarChart3, Ban, Repeat2, Send, BellOff, Plus, Image as ImageIcon, Video, Camera, Zap, Bell } from 'lucide-react';
import { getDefaultAvatar } from './lib/defaultAvatars';
import { muteUser } from './lib/api/blocks';

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

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="LBT" className="w-16 h-16 rounded-2xl" />
        <div className="w-5 h-5 border-2 border-gray-200 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}

function AuthPage() {
  return <AuthView onLoginSuccess={() => window.location.reload()} />;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/logo.png" alt="LBT" className="w-16 h-16 rounded-2xl" />
        <h1 className="text-2xl font-bold text-on-surface">Page Not Found</h1>
        <p className="text-outline text-sm">The page you're looking for doesn't exist.</p>
        <a href="/" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          Go Home
        </a>
      </div>
    </div>
  );
}

function OutletLayout({ context }: { context: OutletContextType }) {
  return <Outlet context={context} />;
}

function AppLayout() {
  const state = useAppState();
  const { currentUser, location, isReelsPage } = state;

  const TAB_ORDER = ['/', '/explore', '/reels', '/messages'];
  const swipeStartXRef = React.useRef(0);
  const swipeStartYRef = React.useRef(0);

  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0].clientX;
    swipeStartYRef.current = e.touches[0].clientY;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - swipeStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartYRef.current;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (Math.abs(deltaX) < 80) return;
    const currentIdx = TAB_ORDER.indexOf(location.pathname);
    if (currentIdx === -1) return;
    const nextIdx = deltaX < 0 ? Math.min(currentIdx + 1, TAB_ORDER.length - 1) : Math.max(currentIdx - 1, 0);
    if (nextIdx !== currentIdx) state.navigate(TAB_ORDER[nextIdx]);
  };

  const outletContext: OutletContextType = useMemo(() => ({
    currentUser: currentUser!,
    darkMode: state.darkMode,
    toggleDarkMode: state.toggleDarkMode,
    triggerToast: state.triggerToast,
    posts: state.posts,
    postsLoading: state.postsLoading,
    postsError: state.postsError,
    isInfiniteLoading: state.postsLoading && state.posts.length > 0,
    loadMore: state.loadMore,
    refresh: state.refresh,
    handleLikeToggle: state.handleLikeToggle,
    handleBookmarkToggle: state.handleBookmarkToggle,
    handleAddComment: state.handleAddComment,
    handleDeletePost: state.handleDeletePost,
    storyGroups: state.storyGroups,
    liveNotifications: state.liveNotifications,
    showAddStoryModal: state.showAddStoryModal,
    setShowAddStoryModal: state.setShowAddStoryModal,
    setShowNoteInput: state.setShowNoteInput,
    handleStoryAdded: state.handleStoryAdded,
    handleViewStory: state.handleViewStory,
    handleMarkAllNotificationsAsRead: state.handleMarkAllNotificationsAsRead,
    postMenuPostId: state.postMenuPostId,
    setPostMenuPostId: state.setPostMenuPostId,
    showPermissionDenied: state.showPermissionDenied,
    setRepostTargetPost: state.setRepostTargetPost,
    setShowRepostModal: state.setShowRepostModal,
  }), [
    state.currentUser, state.darkMode, state.toggleDarkMode, state.triggerToast,
    state.posts, state.postsLoading, state.postsError,
    state.loadMore, state.refresh,
    state.handleLikeToggle, state.handleBookmarkToggle, state.handleAddComment, state.handleDeletePost,
    state.storyGroups, state.liveNotifications,
    state.showAddStoryModal, state.setShowAddStoryModal, state.setShowNoteInput,
    state.handleStoryAdded, state.handleViewStory, state.handleMarkAllNotificationsAsRead,
    state.postMenuPostId, state.setPostMenuPostId,
    state.showPermissionDenied,
    state.setRepostTargetPost, state.setShowRepostModal,
  ]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen w-full overflow-x-clip font-sans bg-surface-container-low text-on-surface transition-colors duration-300">
      <AnimatePresence>
        {!state.isOnline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-zinc-900 border-b border-white/10 px-4 py-2 flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-white">You're offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.toast && <Toast key={state.toast.message} message={state.toast.message} type={state.toast.type} />}
      </AnimatePresence>

      {state.postMenuPostId && (() => {
        const menuPost = state.posts.find(p => p.id === state.postMenuPostId);
        if (!menuPost) return null;
        const isOwn = menuPost.user.id === currentUser.id;
        const menuItems: BottomSheetMenuItem[] = isOwn
          ? [
              { icon: <IconEdit />, label: 'Edit Caption', onClick: () => {
                state.setEditingPostId(menuPost.id);
                state.setEditCaption(menuPost.caption || '');
                state.setPostMenuPostId(null);
              }},
              { icon: <IconArchive />, label: 'Archive', onClick: async () => {
                await (supabase.from('posts') as any).update({ is_archived: true }).eq('id', menuPost.id);
                state.setPostMenuPostId(null);
                state.triggerToast('Post archived');
              }},
              { icon: <BarChart3 className="w-5 h-5" />, label: 'Insights', onClick: async () => {
                const insights = await state.fetchInsights(menuPost.id);
                state.setPostInsights(insights);
                state.setShowInsightsModal(true);
                state.setPostMenuPostId(null);
              }},
              { icon: <IconShare />, label: 'Share Post', onClick: async () => {
                await state.handleSharePost(menuPost.id);
                state.setPostMenuPostId(null);
              }},
              { icon: <Repeat2 className="w-5 h-5" />, label: 'Repost', onClick: () => {
                state.setRepostTargetPost(menuPost);
                state.setShowRepostModal(true);
                state.setPostMenuPostId(null);
              }},
              { icon: <Send className="w-5 h-5" />, label: 'Share to DM', onClick: () => {
                state.setShareToDmPostId(menuPost.id);
                state.setPostMenuPostId(null);
              }},
              { icon: <IconSave />, label: 'Save to Collection', onClick: () => {
                state.setBookmarkPostId(menuPost.id);
                state.setPostMenuPostId(null);
              }},
              { icon: <IconTrash />, label: 'Delete Post', destructive: true, onClick: async () => {
                await state.handleDeletePost(menuPost.id);
                state.setPostMenuPostId(null);
                state.triggerToast('Post deleted');
              }},
            ]
          : [
              { icon: <IconShare />, label: 'Share Post', onClick: async () => {
                await state.handleSharePost(menuPost.id);
                state.setPostMenuPostId(null);
              }},
              { icon: <Repeat2 className="w-5 h-5" />, label: 'Repost', onClick: () => {
                state.setRepostTargetPost(menuPost);
                state.setShowRepostModal(true);
                state.setPostMenuPostId(null);
              }},
              { icon: <BellOff className="w-5 h-5" />, label: 'Mute Account', onClick: async () => {
                try {
                  await muteUser(menuPost.user.id);
                  state.triggerToast(`Muted ${menuPost.user.name}`);
                  await state.refresh();
                } catch (err) {
                  console.error('Mute user failed:', err);
                  state.triggerToast('Failed to mute user', 'error');
                }
                state.setPostMenuPostId(null);
              }},
              { icon: <IconFlag />, label: 'Report', onClick: () => {
                state.setReportTarget({ id: menuPost.id, type: 'post' });
                state.setShowReportModal(true);
                state.setPostMenuPostId(null);
              }, destructive: true },
              { icon: <Ban className="w-5 h-5" />, label: 'Block User', destructive: true, onClick: async () => {
                try {
                  await supabase.from('user_blocks').insert({
                    blocker_id: currentUser.id,
                    blocked_id: menuPost.user.id,
                  });
                  // BUG #11 FIX: validate both IDs are well-formed UUIDs before
                  // interpolating into a PostgREST `.or()` filter string. These
                  // values currently always come from authenticated session /
                  // server-returned post data, but this guard prevents the
                  // pattern from becoming exploitable if that ever changes.
                  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (UUID_RE.test(currentUser.id) && UUID_RE.test(menuPost.user.id)) {
                    await supabase.from('follows').delete()
                      .or(`and(follower_id.eq.${currentUser.id},following_id.eq.${menuPost.user.id}),and(follower_id.eq.${menuPost.user.id},following_id.eq.${currentUser.id})`);
                  } else {
                    console.error('Block user: invalid UUID(s), skipping follow-relationship cleanup');
                  }
                  state.triggerToast('User blocked');
                } catch (err) {
                  console.error('Block user failed:', err);
                  state.triggerToast('Failed to block user', 'error');
                }
                state.setPostMenuPostId(null);
              }},
            ];
        return (
          <BottomSheetMenu
            isOpen={true}
            onClose={() => state.setPostMenuPostId(null)}
            items={menuItems}
            header={{
              avatar: menuPost.user.avatar || undefined,
              name: menuPost.user.name,
              subtitle: menuPost.timeLabel,
            }}
          />
        );
      })()}

      {state.showAddStoryModal && (
        <AddStoryView onClose={() => state.setShowAddStoryModal(false)} onStoryAdded={state.handleStoryAdded} />
      )}

      {state.viewingStoryGroupIndex !== null && (
        <StoryViewer
          groups={state.storyGroups}
          initialGroupIndex={state.viewingStoryGroupIndex}
          currentUserId={currentUser.id}
          onClose={() => state.setViewingStoryGroupIndex(null)}
        />
      )}

      {state.showCreatePost && (
        <CreatePostView
          currentUser={currentUser}
          onPostCreated={state.handlePostCreated}
          onNavigateToFeed={(postId?: string) => {
            state.setShowCreatePost(false);
            if (postId) state.navigate('/post/' + postId);
          }}
          type={state.createPostType}
        />
      )}

      {state.editingPostId && (
        <EditPostModal
          editCaption={state.editCaption}
          setEditCaption={state.setEditCaption}
          isSavingEdit={state.isSavingEdit}
          onSave={state.handleSaveEditPost}
          onCancel={() => { state.setEditingPostId(null); state.setEditCaption(''); }}
        />
      )}

      <MobileHeader
        liveNotifications={state.liveNotifications}
        currentUser={{ id: currentUser.id, avatar: currentUser.avatar || getDefaultAvatar(currentUser.id) }}
        headerVisible={state.headerVisible}
        isReelsPage={isReelsPage}
      />

      <header className={`hidden md:flex max-w-7xl mx-auto w-full h-16 items-center justify-between px-6 border-b border-outline-variant/15 bg-surface-container-lowest/90 dark:bg-surface-container-low/90 ${isReelsPage ? 'md:hidden' : ''}`}>
        <button type="button" onClick={() => state.navigate('/')} className="flex items-center gap-3 rounded-xl">
          <img src="/logo.png" alt="LBT Social" className="w-9 h-9 rounded-xl object-contain" />
          <span className="text-sm font-extrabold tracking-tight text-on-surface">LBT Social</span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Notifications" onClick={() => state.navigate('/notifications')} className="relative grid h-10 w-10 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container">
            <Bell className="w-5 h-5" />
            {state.liveNotifications.some((n) => n.isUnread) && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />}
          </button>
          <button type="button" aria-label="My profile" onClick={() => state.navigate('/profile/' + currentUser.id)} className="h-10 w-10 overflow-hidden rounded-full border border-outline-variant/40">
            <img src={currentUser.avatar || getDefaultAvatar(currentUser.id)} alt="My profile" className="h-full w-full object-cover" />
          </button>
        </div>
      </header>

      <div className={`flex max-w-7xl mx-auto w-full relative ${isReelsPage ? 'h-dvh' : 'h-[calc(100dvh-4rem)]'} min-h-0 overflow-x-clip`}>
        <section
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-clip w-full no-scrollbar ${isReelsPage ? 'pb-0 pt-0 px-0' : 'px-0 pb-20 pt-16 md:pt-0 md:pb-6 md:px-6'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {(() => {
            const isFullWidth = location.pathname === '/reels' || location.pathname === '/explore' || location.pathname === '/messages';
            return (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
                  className={isFullWidth ? 'w-full' : 'max-w-[600px] mx-auto w-full'}
                >
                  <React.Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route element={<OutletLayout context={outletContext} />}>
                        <Route index element={<HomePage />} />
                        <Route path="explore" element={<ExplorePage />} />
                        <Route path="reels" element={<ReelsPage />} />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="bookmarks" element={<BookmarksPage />} />
                        <Route path="profile/:id" element={<ProfilePage />} />
                        <Route path="edit-profile" element={<EditProfilePage />} />
                        <Route path="post/:id" element={<PostDetailPage />} />
                        <Route path="hashtag/:tag" element={<HashtagPage />} />
                        <Route path="close-friends" element={<CloseFriendsManager />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="insights" element={<InsightsPage />} />
                      </Route>
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </React.Suspense>
                </motion.div>
              </AnimatePresence>
            );
          })()}
        </section>
      </div>

      {!isReelsPage && (
      <MobileNav
        navVisible={state.navVisible}
        unreadMessages={state.unreadMessages}
        showCreateMenu={state.showCreateMenu}
        setShowCreateMenu={state.setShowCreateMenu}
        setCreatePostType={state.setCreatePostType}
        setShowCreatePost={state.setShowCreatePost}
        setShowNoteInput={state.setShowNoteInput}
        setShowAddStoryModal={state.setShowAddStoryModal}
      />

      <NoteInputModal
        isOpen={state.showNoteInput}
        onClose={() => state.setShowNoteInput(false)}
        currentUser={{ id: currentUser.id }}
      />

      {state.reportTarget && (
        <ReportModal
          isOpen={state.showReportModal}
          onClose={() => { state.setShowReportModal(false); state.setReportTarget(null); }}
          reportedId={state.reportTarget.id}
          reportType={state.reportTarget.type}
          reporterId={currentUser.id}
        />
      )}

      {state.shareToDmPostId && (
        <ShareToDmModal
          isOpen={!!state.shareToDmPostId}
          onClose={() => state.setShareToDmPostId(null)}
          postId={state.shareToDmPostId}
          onShareSent={() => state.triggerToast('Shared to DM!')}
        />
      )}

      {state.bookmarkPostId && (
        <BookmarkCollectionsModal
          isOpen={!!state.bookmarkPostId}
          onClose={() => state.setBookmarkPostId(null)}
          postId={state.bookmarkPostId}
          onSave={(name) => state.triggerToast(`Saved to ${name}`)}
        />
      )}

      <AnimatePresence>
        {state.showInsightsModal && state.postInsights && (
          <InsightsModal postInsights={state.postInsights} onClose={() => state.setShowInsightsModal(false)} />
        )}
      </AnimatePresence>


    </div>
  );
}

export default function App() {
  const { initialize } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('lbt_onboarding_complete') === 'true';
  });

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    void StatusBar.setBackgroundColor({ color: '#F7F6F2' }).catch(() => {});
  }, []);

  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (currentUser?.id) {
      requestNotificationPermission().then((permission) => {
        if (permission === 'granted') subscribeToPush(currentUser.id);
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

  if (!onboardingComplete) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  return (
    <I18nProvider>
      <Routes>
        <Route path="/auth" element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
        <Route element={<ProtectedRoute />}>
          <Route path="*" element={<AppLayout />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </I18nProvider>
  );
}
