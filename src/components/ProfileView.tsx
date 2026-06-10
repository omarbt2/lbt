import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Post } from '../types';
import { Grid, Film, Tag, Users, Check, Search, MessageSquare, ArrowLeft, QrCode, Share2, Copy, Camera, Settings, Lock, MoreVertical, Link, Ban, Flag, Edit3, BarChart3, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '../lib/api/follows';
import { blockUser, isBlocked as checkIsBlocked } from '../lib/api/blocks';
import { getProfilePosts } from '../lib/api/profiles';
import { getFollowRequestStatus, sendFollowRequest } from '../lib/api/followRequests';
import { supabase } from '../lib/supabase';
import { mapProfileToUser } from '../store/authStore';
import { useStorage } from '../hooks/useStorage';
import { Avatar } from './ui/Avatar';
import BottomSheetMenu from './ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './ui/BottomSheetMenu';
import ReportModal from './ReportModal';

interface ProfileViewProps {
  user: User;
  currentUser: User;
  onStartMessage: (user: User) => void;
  onPostSelect: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onEditProfile?: () => void;
  onNavigateToInsights?: () => void;
}

export default function ProfileView({
  user,
  currentUser,
  onStartMessage,
  onPostSelect,
  onDeletePost,
  onEditProfile,
  onNavigateToInsights,
}: ProfileViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tagged'>('posts');
  const [isFollowing, setIsFollowing] = useState(!!user.isFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlockedUser, setIsBlockedUser] = useState(false);

  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileReels, setProfileReels] = useState<any[]>([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const scrollThrottled = useRef(false);

  const { uploadFile, isUploading } = useStorage();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = user.id === currentUser.id;

  useEffect(() => {
    if (user.id && currentUser.id && user.id !== currentUser.id) {
      checkIsFollowing(user.id).then(setIsFollowing).catch(() => {});
      checkIsBlocked(user.id).then(setIsBlockedUser).catch(() => {});
      if (user.is_private) {
        getFollowRequestStatus(user.id).then(setFollowRequestStatus).catch(() => {});
      }
    }
  }, [user.id, currentUser.id, user.is_private]);

  const canViewPosts = !user.is_private || isFollowing || isOwnProfile;

  useEffect(() => {
    if (!canViewPosts) {
      setProfilePosts([]);
      setPostsLoading(false);
      return;
    }
    setPostsLoading(true);
    setProfilePosts([]);
    setPostsOffset(0);
    setHasMorePosts(true);
    getProfilePosts(user.id, 20, 0)
      .then((data) => {
        setProfilePosts(data);
        if (data.length < 20) setHasMorePosts(false);
      })
      .catch(console.error)
      .finally(() => setPostsLoading(false));
  }, [user.id, canViewPosts]);

  useEffect(() => {
    if (!user?.id || !canViewPosts) return;
    setReelsLoading(true);
    supabase
      .from('reels')
      .select('id, video_url, thumbnail_url, likes_count, views_count, caption')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfileReels(data || []);
        setReelsLoading(false);
      });
  }, [user?.id, canViewPosts]);

  const loadMorePosts = useCallback(async () => {
    if (postsLoading || !hasMorePosts) return;
    const next = postsOffset + 20;
    setPostsOffset(next);
    setPostsLoading(true);
    try {
      const data = await getProfilePosts(user.id, 20, next);
      setProfilePosts((prev) => [...prev, ...data]);
      if (data.length < 20) setHasMorePosts(false);
    } catch (e) { console.error(e); }
    finally { setPostsLoading(false); }
  }, [postsLoading, hasMorePosts, postsOffset, user.id]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollThrottled.current) return;
      const scrollTop = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollTop >= docHeight - 300 && hasMorePosts && !postsLoading) {
        scrollThrottled.current = true;
        loadMorePosts().finally(() => {
          setTimeout(() => { scrollThrottled.current = false; }, 500);
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, hasMorePosts, postsLoading]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile('avatars', file);
      await supabase.from('profiles').update({ cover_url: url }).eq('id', user.id);
      window.location.reload();
    } catch (err) {
      console.error('Cover upload failed:', err);
    }
  };

  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [qrDownloaded, setQrDownloaded] = useState<boolean>(false);

  const generateQRMatrix = (username: string) => {
    const size = 21;
    const matrix = Array(size).fill(0).map(() => Array(size).fill(false));
    const hash = (str: string, index: number) => {
      let h = 5381 + index;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
      }
      return Math.abs(h);
    };
    const drawFinder = (rowOffset: number, colOffset: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rowOffset + r][colOffset + c] = isBorder || isInner;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);
    const centerStart = 8;
    const centerEnd = 12;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= 13;
        const inBottomLeft = r >= 13 && c < 8;
        const inCenter = r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
        if (inTopLeft || inTopRight || inBottomLeft || inCenter) continue;
        if (r === 6 || c === 6) {
          matrix[r][c] = (r === 6 ? c : r) % 2 === 0;
          continue;
        }
        const val = hash(username, r * size + c);
        matrix[r][c] = val % 2 === 0;
      }
    }
    return matrix;
  };

  const [showFollowersModal, setShowFollowersModal] = useState<boolean>(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
  const [followListQuery, setFollowListQuery] = useState('');
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);

  useEffect(() => {
    if (!showFollowersModal) return;
    const fetchList = async () => {
      if (followersModalType === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('follower_id, profiles:follower_id(*)')
          .eq('following_id', user.id)
          .limit(50);
        if (data) setFollowersList(data.map((f: any) => mapProfileToUser(f.profiles)));
      } else {
        const { data } = await supabase
          .from('follows')
          .select('following_id, profiles:following_id(*)')
          .eq('follower_id', user.id)
          .limit(50);
        if (data) setFollowingList(data.map((f: any) => mapProfileToUser(f.profiles)));
      }
    };
    fetchList();
  }, [showFollowersModal, followersModalType, user.id]);

  const activeFollowList = followersModalType === 'followers' ? followersList : followingList;

  const handleFollowToggle = async () => {
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowUser(user.id);
        setIsFollowing(false);
        setFollowRequestStatus(null);
      } else if (user.is_private) {
        await sendFollowRequest(user.id);
        setFollowRequestStatus('pending');
      } else {
        await followUser(user.id);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowModal = (type: 'followers' | 'following') => {
    setFollowersModalType(type);
    setShowFollowersModal(true);
  };

  const handleBlock = async () => {
    setShowProfileMenu(false);
    const confirmBlock = window.confirm(`Block @${user.username}? They won't be able to see your posts or follow you.`);
    if (!confirmBlock) return;
    try {
      await blockUser(user.id);
      setIsBlockedUser(true);
      onStartMessage && onStartMessage(user);
    } catch (err) {
      console.error('Block failed:', err);
    }
  };

  const filteredAttendees = activeFollowList.filter((item) => {
    return (
      item.name.toLowerCase().includes(followListQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(followListQuery.toLowerCase())
    );
  });

  const formatCount = (n?: number) => {
    if (!n) return '0';
    if (n > 999) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const ownMenuItems: BottomSheetMenuItem[] = [
    { icon: <Edit3 size={18} />, label: 'Edit Profile', onClick: () => { setShowProfileMenu(false); onEditProfile?.(); } },
    { icon: <Share2 size={18} />, label: 'Share Profile', onClick: () => {
      navigator.clipboard.writeText(`https://lbt-social.network/user/${user.username}`);
      setShowProfileMenu(false);
    }},
    { icon: <BarChart3 size={18} />, label: 'Insights', onClick: () => { setShowProfileMenu(false); onNavigateToInsights?.(); } },
    { icon: <Settings size={18} />, label: 'Settings', onClick: () => { setShowProfileMenu(false); } },
  ];

  const otherMenuItems: BottomSheetMenuItem[] = [
    { icon: <Share2 size={18} />, label: 'Share Profile', onClick: () => {
      navigator.clipboard.writeText(`https://lbt-social.network/user/${user.username}`);
      setShowProfileMenu(false);
    }},
    { icon: <Link size={18} />, label: 'Copy Profile Link', onClick: () => {
      navigator.clipboard.writeText(`lbt://profile/${user.username}`);
      setShowProfileMenu(false);
    }},
    { icon: <Ban size={18} />, label: isBlockedUser ? 'Unblock User' : 'Block User', onClick: handleBlock, destructive: true },
    { icon: <Flag size={18} />, label: 'Report User', onClick: () => { setShowProfileMenu(false); setShowReportModal(true); }, destructive: true },
  ];

  return (
    <div className="flex flex-col animate-fadeIn" id="profile_screen">
      {/* COVER PHOTO — 300px full-width */}
      <section className="relative h-[300px] w-full overflow-hidden">
        {user.cover_url ? (
          <img
            src={user.cover_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {isOwnProfile && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-black/70 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              {user.cover_url ? 'Change Cover' : 'Add Cover'}
            </button>
          </>
        )}
      </section>

      {/* AVATAR + STATS + BIO — staggered entrance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
      {/* AVATAR OVERLAPPING COVER */}
      <div className="relative z-10 -mt-12 flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-white bg-surface shadow-lg overflow-hidden">
            <Avatar
              src={user.avatar}
              userId={user.id}
              name={user.name}
              size="xl"
              className="w-24 h-24 border-2 border-white bg-surface shadow-lg"
            />
          </div>
          {user.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {/* NAME & USERNAME — directly below avatar */}
      <div className="flex flex-col items-center mt-3 px-4 gap-0.5">
        <h1 className="text-lg font-semibold text-white leading-tight">
          {user.name}
        </h1>
        <span className="text-sm text-gray-400">@{user.username}</span>
        {(user as any).status_emoji && (
          <div className="flex items-center gap-1.5 mt-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10">
            <span className="text-sm">{(user as any).status_emoji}</span>
            {(user as any).status_text && (
              <span className="text-[11px] font-medium text-white/80">{(user as any).status_text}</span>
            )}
          </div>
        )}
      </div>

      {/* STATS ROW */}
      <div className="flex justify-center gap-8 mt-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          className="text-center"
        >
          <div className="text-lg font-black text-on-surface">{formatCount(user.posts_count ?? profilePosts.length)}</div>
          <div className="text-[9px] font-bold text-outline uppercase tracking-wider">Posts</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17, duration: 0.25 }}
          className="text-center cursor-pointer hover:opacity-85"
          onClick={() => openFollowModal('followers')}
        >
          <div className="text-lg font-black text-on-surface">{formatCount(user.followersCount)}</div>
          <div className="text-[9px] font-bold text-outline uppercase tracking-wider hover:underline">Followers</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.25 }}
          className="text-center cursor-pointer hover:opacity-85"
          onClick={() => openFollowModal('following')}
        >
          <div className="text-lg font-black text-on-surface">{formatCount(user.followingCount)}</div>
          <div className="text-[9px] font-bold text-outline uppercase tracking-wider hover:underline">Following</div>
        </motion.div>
      </div>

      {/* BIO */}
      {user.bio && (
        <p className="text-xs text-on-surface-variant max-w-sm font-medium leading-relaxed mt-3 mx-auto text-center px-6">
          {user.bio}
        </p>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-2.5 mt-5 w-full max-w-xs px-4 mx-auto">
        {isOwnProfile ? (
          <>
            <button
              onClick={onEditProfile}
              className="flex-1 bg-surface-container text-on-surface font-bold text-xs py-2.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" /> Edit Profile
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/40 transition-all text-on-surface cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Show QR code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowProfileMenu(true)}
              className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/40 transition-all text-on-surface cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Profile options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer ${
                isFollowing
                  ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/40'
                  : 'bg-on-surface text-surface hover:opacity-90'
              }`}
            >
              {followRequestStatus === 'pending' ? 'Requested' : isFollowing ? 'Following' : 'Follow'}
            </motion.button>
            <button
              onClick={() => onStartMessage(user)}
              className="flex-1 font-bold text-xs py-2.5 rounded-xl border border-on-surface text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            >
              Message
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/40 transition-all text-on-surface cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Show QR code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowProfileMenu(true)}
              className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/40 transition-all text-on-surface cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Profile options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      </motion.div>

      {/* TAB BAR — underline style */}
      <section className="px-4 mt-6">
        <div className="flex border-b border-outline-variant/20 relative">
          {(['posts', 'reels', 'tagged'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 transition-all relative ${
                activeTab === tab
                  ? 'text-on-surface font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'posts' && <Grid className="w-4 h-4" />}
              {tab === 'reels' && <Film className="w-4 h-4" />}
              {tab === 'tagged' && <Tag className="w-4 h-4" />}
              <span className="text-xs capitalize">{tab}</span>
              {activeTab === tab && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-on-surface"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* POSTS GRID — 3-column, 1px gap */}
      <section className="mt-1 grid grid-cols-3 gap-px pb-12" id="profile_grids">
        {!canViewPosts && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center">
              <Lock className="w-7 h-7 text-outline" />
            </div>
            <p className="text-sm font-bold text-on-surface">This account is private</p>
            <p className="text-xs text-outline text-center px-8">Follow this account to see their photos and reels</p>
            {followRequestStatus === 'pending' ? (
              <span className="px-5 py-2 rounded-full border border-primary/40 text-primary text-xs font-semibold">
                Request Sent
              </span>
            ) : (
              <button
                onClick={handleFollowToggle}
                className="px-6 py-2 rounded-full bg-primary text-white text-xs font-bold"
              >
                Follow
              </button>
            )}
          </div>
        )}
        {activeTab === 'posts' && profilePosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            onClick={() => onPostSelect(post.id)}
            className="aspect-square overflow-hidden bg-surface-container-highest cursor-pointer hover:opacity-85 transition-opacity relative group"
          >
            <img
              src={post.imageUrl}
              alt="Feed Post"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
              <span className="flex items-center gap-1 text-xs font-bold">
                ♥ {post.likes}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold">
                💬 {post.commentsCount}
              </span>
            </div>
          </motion.div>
        ))}

        {activeTab === 'reels' && (
          reelsLoading ? (
            <div className="col-span-3 py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {isOwnProfile && (
                <div
                  className="aspect-square bg-surface-container-highest border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => document.getElementById('reel-upload-input')?.click()}
                >
                  <Plus className="w-8 h-8 text-outline" />
                  <span className="text-[10px] text-outline font-semibold text-center">New Reel</span>
                  <input
                    id="reel-upload-input"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split('.').pop();
                      const path = `reels/${user.id}/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from('reels').upload(path, file);
                      if (error) { console.error(error); return; }
                      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path);
                      await supabase.from('reels').insert({
                        user_id: user.id,
                        video_url: publicUrl,
                        is_public: true,
                        is_archived: false,
                      });
                      const { data } = await supabase.from('reels').select('id,video_url,thumbnail_url,likes_count,views_count,caption').eq('user_id', user.id).eq('is_archived', false).order('created_at', { ascending: false });
                      setProfileReels(data || []);
                    }}
                  />
                </div>
              )}
              {profileReels.length === 0 ? (
                <div className="col-span-3 py-8 text-center text-xs text-outline">No reels yet</div>
              ) : (
                profileReels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => navigate('/reels?id=' + reel.id)}
                    className="aspect-square overflow-hidden bg-surface-container-highest cursor-pointer hover:opacity-85 transition-opacity relative"
                  >
                    {reel.thumbnail_url ? (
                      <img src={reel.thumbnail_url} alt="Reel" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <video src={reel.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                      <Film className="w-3 h-3 text-white" />
                      <span className="text-[9px] text-white font-bold">{reel.views_count ?? 0}</span>
                    </div>
                  </div>
                ))
              )}
            </>
          )
        )}

        {activeTab === 'tagged' && (
          <div className="aspect-square bg-surface-container-highest flex items-center justify-center">
            <p className="text-[10px] text-outline font-semibold">No tagged posts</p>
          </div>
        )}

        {postsLoading && activeTab === 'posts' && (
          <div className="col-span-3 py-6 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!postsLoading && activeTab === 'posts' && profilePosts.length === 0 && (
          <div className="col-span-3 py-12 text-center">
            <p className="text-sm font-semibold text-on-surface-variant">No posts yet</p>
          </div>
        )}
      </section>

      {/* FOLLOWERS/FOLLOWING MODAL */}
      <AnimatePresence>
      {showFollowersModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-surface-container-lowest rounded-3xl w-full max-w-[400px] max-h-[85%] flex flex-col p-5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold tracking-tight text-on-surface capitalize">
                {followersModalType === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button
                onClick={() => { setShowFollowersModal(false); setFollowListQuery(''); }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Close
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={followListQuery}
                onChange={(e) => setFollowListQuery(e.target.value)}
                placeholder="Search profiles..."
                className="w-full bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/60 rounded-full py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary/20 text-on-surface placeholder:text-outline"
              />
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-1 py-1 hover:no-scrollbar">
              {filteredAttendees.map((atd) => (
                <div
                  key={atd.id}
                  className="flex items-center justify-between p-2.5 bg-surface-container-lowest/70 dark:bg-surface-container/70 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={atd.avatar} userId={atd.id} name={atd.name} size="md" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface leading-tight">{atd.name}</span>
                      <span className="text-[10px] text-outline font-medium">@{atd.username}</span>
                    </div>
                  </div>
                  {atd.id !== currentUser.id && (
                    <button
                      onClick={() => followUser(atd.id).catch(console.error)}
                      className="text-[10px] font-bold py-1.5 px-4 rounded-full transition-all active:scale-95 bg-on-surface text-surface"
                    >
                      Follow
                    </button>
                  )}
                </div>
              ))}

              {filteredAttendees.length === 0 && (
                <p className="text-center text-xs text-outline py-8">No accounts found.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* QR CODE MODAL */}
      <AnimatePresence>
      {showQRModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0" onClick={() => { setShowQRModal(false); setQrCopied(false); setQrDownloaded(false); }} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm bg-gradient-to-b from-[#1a2744] to-[#0f1a2e] border border-white/10 p-6 rounded-3xl shadow-2xl text-center text-white flex flex-col items-center gap-4"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase font-mono bg-primary/10 px-3 py-1 rounded-full">LBT QR Connection</span>
              <h3 className="text-lg font-bold mt-2">Scan & Connect</h3>
              <p className="text-xs text-white/50">Hold camera to the code to view profile</p>
            </div>

            <div className="relative bg-white p-4.5 rounded-2xl shadow-xl w-48 h-48 flex items-center justify-center border-4 border-primary">
              <svg viewBox="0 0 21 21" className="w-full h-full text-slate-950 fill-current shape-rendering-crispedges">
                {generateQRMatrix(user.username || 'anon').map((row, rIdx) =>
                  row.map((val, cIdx) => val ? (
                    <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" />
                  ) : null)
                )}
              </svg>
              <div className="absolute w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                <span className="font-sans font-black text-[12px] tracking-tighter leading-none">LBT</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl w-full justify-center">
              <Avatar src={user.avatar} userId={user.id} name={user.name} size="sm" className="w-8 h-8 border border-primary/40 shadow-sm" />
              <div className="text-left">
                <p className="text-xs font-bold leading-none">{user.name}</p>
                <p className="text-[10px] text-white/40 mt-0.5">@{user.username}</p>
              </div>
            </div>

            {qrDownloaded && (
              <div className="text-[11px] text-on-surface font-bold bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-xl w-full animate-fadeIn flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Saved to Gallery!
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 w-full mt-1.5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://lbt-social.network/user/${user.username}`);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer border border-white/5 active:scale-95 text-white"
              >
                {qrCopied ? <><Check className="w-3.5 h-3.5 text-on-surface" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
              </button>
              <button
                onClick={() => { setQrDownloaded(true); setTimeout(() => setQrDownloaded(false), 3000); }}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 text-white shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" /> Save QR Code
              </button>
            </div>

            <button
              onClick={() => { setShowQRModal(false); setQrCopied(false); setQrDownloaded(false); }}
              className="text-xs text-white/40 hover:text-white mt-1.5 font-medium hover:underline cursor-pointer"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* BOTTOM SHEET MENU */}
      <BottomSheetMenu
        isOpen={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        items={isOwnProfile ? ownMenuItems : otherMenuItems}
        header={{
          avatar: user.avatar || undefined,
          name: user.name,
        }}
      />

      {!isOwnProfile && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId={user.id}
          reportType="user"
          reporterId={currentUser.id}
        />
      )}
    </div>
  );
}
