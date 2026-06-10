import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Heart, MessageCircle, Send, MoreHorizontal, Music, Plus,
  Bookmark as BookmarkIcon, ArrowLeft, Flag, Copy, Volume2, VolumeX, UserPlus, UserCheck, Trash2, Repeat2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BottomSheetMenu from './ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './ui/BottomSheetMenu';
import ReportModal from './ReportModal';
import { getDefaultAvatar } from '../lib/defaultAvatars';

interface ReelsViewProps {
  onBackToFeed: () => void;
}

function ReelSkeleton() {
  return (
    <div className="relative h-dvh w-full bg-surface-container-lowest flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Loading reels</span>
      </div>
    </div>
  );
}

export default function ReelsView({ onBackToFeed }: ReelsViewProps) {
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [reelLikesCount, setReelLikesCount] = useState<Record<string, number>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [doubleTapPos, setDoubleTapPos] = useState<{ x: number; y: number } | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [menuReel, setMenuReel] = useState<any>(null);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReelId, setReportReelId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const interactedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    const fetchReels = async () => {
      setIsLoadingReels(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const { data, error } = await supabase
          .from('reels')
          .select('*, profiles(id, username, display_name, avatar_url, is_verified)')
          .eq('is_public', true)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setReels(data);
          const counts: Record<string, number> = {};
          data.forEach((r: any) => { counts[r.id] = r.likes_count ?? 0; });
          setReelLikesCount(counts);

          if (user) {
            const ids = data.map((r: any) => r.id);
            const authorIds = [...new Set(data.map((r: any) => r.profiles?.id).filter(Boolean))] as string[];

            const [{ data: likedData }, { data: followData }] = await Promise.all([
              supabase.from('reel_likes').select('reel_id').eq('user_id', user.id).in('reel_id', ids),
              supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', authorIds),
            ]);

            const likedMap: Record<string, boolean> = {};
            (likedData || []).forEach((l: any) => { likedMap[l.reel_id] = true; });
            setLikedReels(likedMap);

            const followMap: Record<string, boolean> = {};
            (followData || []).forEach((f: any) => { followMap[f.following_id] = true; });
            setFollowState(followMap);
          }
        } else {
          setReels([]);
        }
      } catch (err) {
        console.error('Error fetching reels:', err);
        setReels([]);
      }
      setIsLoadingReels(false);
    };
    fetchReels();
  }, []);

  // Intersection observer for autoplay
  useEffect(() => {
    if (!containerRef.current || reels.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-reel-index'));
          const video = videoRefs.current.get(idx);
          if (!video) return;
          if (entry.isIntersecting) {
            setActiveIdx(idx);
            video.currentTime = 0;
            video.muted = isMutedRef.current;
            if (!video.src || video.readyState < 2) video.load();
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.7 }
    );
    const children = containerRef.current.querySelectorAll('[data-reel-index]');
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [reels]);

  // Sync mute to all videos
  useEffect(() => {
    videoRefs.current.forEach((video) => { video.muted = isMuted; });
  }, [isMuted]);

  const handleLike = async (id: string) => {
    if (!currentUserId) return;
    const isLiked = likedReels[id] ?? false;
    setLikedReels(prev => ({ ...prev, [id]: !isLiked }));
    setReelLikesCount(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1)) }));
    if (!isLiked) { setHeartBurst(true); setTimeout(() => setHeartBurst(false), 600); }
    try {
      if (!isLiked) {
        await supabase.from('reel_likes').insert({ reel_id: id, user_id: currentUserId });
      } else {
        await supabase.from('reel_likes').delete().eq('reel_id', id).eq('user_id', currentUserId);
      }
    } catch {
      setLikedReels(prev => ({ ...prev, [id]: isLiked }));
      setReelLikesCount(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)) }));
    }
  };

  const handleFollow = async (profileId: string) => {
    if (!currentUserId || profileId === currentUserId) return;
    const isFollowing = followState[profileId] ?? false;
    setFollowState(prev => ({ ...prev, [profileId]: !isFollowing }));
    try {
      if (!isFollowing) {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileId });
      } else {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId);
      }
    } catch {
      setFollowState(prev => ({ ...prev, [profileId]: isFollowing }));
    }
  };

  const handleDoubleTap = (e: React.MouseEvent, reelId: string) => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      const video = videoRefs.current.get(activeIdx);
      if (video) video.play().catch(() => {});
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDoubleTapPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setDoubleTapPos(null), 800);
    if (!(likedReels[reelId] ?? false)) handleLike(reelId);
  };

  const loadComments = async (reelId: string) => {
    if (reelComments[reelId]) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, display_name, avatar_url)')
      .eq('post_id', reelId)
      .order('created_at', { ascending: true })
      .limit(30);
    if (data) setReelComments(prev => ({ ...prev, [reelId]: data }));
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !reels[activeIdx] || !currentUserId) return;
    const text = commentInput.trim();
    const reelId = reels[activeIdx].id;
    const tempId = `temp_${Date.now()}`;
    const tempComment = { id: tempId, content: text, created_at: new Date().toISOString(), profiles: { display_name: 'You', username: 'you' } };
    setReelComments(prev => ({ ...prev, [reelId]: [...(prev[reelId] || []), tempComment] }));
    setCommentInput('');
    try {
      const { data, error } = await supabase.from('comments').insert({ post_id: reelId, user_id: currentUserId, content: text }).select('*, profiles(*)').single();
      if (!error && data) setReelComments(prev => ({ ...prev, [reelId]: (prev[reelId] || []).map(c => c.id === tempId ? data : c) }));
    } catch {
      setReelComments(prev => ({ ...prev, [reelId]: (prev[reelId] || []).filter(c => c.id !== tempId) }));
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    try {
      await supabase.from('reels').delete().eq('id', reelId).eq('user_id', currentUserId);
      setReels(prev => prev.filter(r => r.id !== reelId));
    } catch (err) {
      console.error('Delete error:', err);
    }
    setConfirmDelete(null);
    setMenuReel(null);
  };

  const buildMenuItems = (reel: any): BottomSheetMenuItem[] => {
    const isOwn = reel.profiles?.id === currentUserId;
    const items: BottomSheetMenuItem[] = [
      {
        icon: <BookmarkIcon className="w-5 h-5" />, label: 'Save',
        onClick: async () => {
          if (currentUserId) {
            try { await supabase.from('saved_posts').insert({ user_id: currentUserId, post_id: reel.id }); } catch (_) {}
          }
          setMenuReel(null);
        }
      },
      {
        icon: <Copy className="w-5 h-5" />, label: 'Copy Link',
        onClick: async () => {
          await navigator.clipboard.writeText(`${window.location.origin}/reels?id=${reel.id}`).catch(() => {});
          setMenuReel(null);
        }
      },
      {
        icon: <Send className="w-5 h-5" />, label: 'Share',
        onClick: async () => {
          const url = `${window.location.origin}/reels?id=${reel.id}`;
          if (navigator.share) {
            try { await navigator.share({ title: reel.caption || 'Reel', url }); } catch (_) {}
          } else {
            await navigator.clipboard.writeText(url).catch(() => {});
          }
          setMenuReel(null);
        }
      },
      {
        icon: <Repeat2 className="w-5 h-5" />, label: 'Remix Reel',
        onClick: () => {
          setMenuReel(null);
          navigate(`/reels/create?duet_of=${reel.id}&duet_url=${encodeURIComponent(reel.video_url)}`);
        }
      },
    ];
    if (isOwn) {
      items.push({
        icon: <Trash2 className="w-5 h-5" />, label: 'Delete Reel', destructive: true,
        onClick: () => { setConfirmDelete(reel.id); setMenuReel(null); }
      });
    } else {
      items.push({
        icon: <Flag className="w-5 h-5" />, label: 'Report', destructive: true,
        onClick: () => { setReportReelId(reel.id); setShowReportModal(true); setMenuReel(null); }
      });
    }
    return items;
  };

  if (isLoadingReels) return <ReelSkeleton />;

  if (!reels.length) {
    return (
      <div className="relative h-dvh bg-black w-full flex flex-col items-center justify-center text-white gap-4">
        <p className="text-sm text-white/60">No reels yet</p>
        <button onClick={onBackToFeed} className="text-xs font-bold text-primary hover:underline">← Back to Feed</button>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black" id="reels_screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onBackToFeed}
            className="font-bold text-sm tracking-tight text-white hover:text-primary flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> LBT
          </button>
        </div>
        <h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">Reels</h1>
        {/* Mute toggle */}
        <button
          onClick={() => {
            setIsMuted(m => {
              const next = !m;
              videoRefs.current.forEach(v => { v.muted = next; });
              return next;
            });
          }}
          className="pointer-events-auto w-9 h-9 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </header>

      {/* Vertical snap scroll */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, idx) => {
          const reelAvatar = reel.profiles?.avatar_url ?? getDefaultAvatar(reel.profiles?.id || '');
          const reelUsername = reel.profiles?.username ?? 'unknown';
          const reelDisplayName = reel.profiles?.display_name ?? reelUsername;
          const isActive = idx === activeIdx;
          const isOwn = reel.profiles?.id === currentUserId;
          const isFollowing = followState[reel.profiles?.id] ?? false;

          return (
            <div
              key={reel.id}
              data-reel-index={idx}
              className="relative h-dvh w-full snap-start snap-always flex items-center justify-center bg-black"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Video */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black" onClick={(e) => handleDoubleTap(e, reel.id)}>
                <video
                  ref={(el) => { if (el) videoRefs.current.set(idx, el); }}
                  src={reel.video_url}
                  className="w-full h-full object-contain bg-black"
                  loop
                  playsInline
                  preload="metadata"
                  muted={isMuted}
                  onClick={() => {
                    if (!interactedRef.current) {
                      interactedRef.current = true;
                      const video = videoRefs.current.get(idx);
                      if (video) video.play().catch(() => {});
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                {/* Double-tap heart */}
                <AnimatePresence>
                  {heartBurst && isActive && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      exit={{}}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Side action buttons */}
              <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
                {/* Avatar + follow */}
                <div className="relative mb-2 flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-tr from-primary to-primary shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => reel.profiles?.id && navigate('/profile/' + reel.profiles.id)}
                  >
                    <img src={reelAvatar} alt="" className="w-full h-full rounded-full object-cover border-2 border-black" />
                  </div>
                  {!isOwn && (
                    <button
                      onClick={() => handleFollow(reel.profiles?.id)}
                      className={`w-5 h-5 flex items-center justify-center rounded-full border border-black shadow ${isFollowing ? 'bg-white' : 'bg-primary'}`}
                    >
                      {isFollowing ? <UserCheck className="w-3 h-3 text-primary" /> : <Plus className="w-3.5 h-3.5 text-white font-bold" />}
                    </button>
                  )}
                </div>

                {/* Like */}
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1.5 text-white">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all ${likedReels[reel.id] ? 'bg-red-500 border-red-500' : 'bg-black/25 border-white/10 backdrop-blur-md'}`}>
                    <Heart className={`w-5 h-5 drop-shadow-lg ${likedReels[reel.id] ? 'fill-white text-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">{reelLikesCount[reel.id] ?? 0}</span>
                </motion.button>

                {/* Comment */}
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => { const newId = showComments === reel.id ? null : reel.id; setShowComments(newId); if (newId) loadComments(newId); }} className="flex flex-col items-center gap-1.5 text-white">
                  <div className="w-12 h-12 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full">
                    <MessageCircle className="w-5 h-5 drop-shadow-lg" />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">{reel.comments_count ?? 0}</span>
                </motion.button>

                {/* Share */}
                <motion.button whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1.5 text-white"
                  onClick={async () => {
                    const url = `${window.location.origin}/reels?id=${reel.id}`;
                    if (navigator.share) { try { await navigator.share({ title: reel.caption || 'Reel', url }); } catch (_) {} }
                    else { await navigator.clipboard.writeText(url).catch(() => {}); }
                  }}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full">
                    <Send className="w-5 h-5 drop-shadow-lg" />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">Share</span>
                </motion.button>

                {/* Repost */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center gap-1.5 text-white"
                  onClick={async () => {
                    if (!currentUserId) return;
                    try {
                      await (supabase.from('post_shares') as any).insert({
                        user_id: currentUserId,
                        post_id: reel.id,
                        share_type: 'repost'
                      });
                    } catch (_) {}
                  }}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full">
                    <Repeat2 className="w-5 h-5 drop-shadow-lg" />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">Repost</span>
                </motion.button>

                {/* More */}
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setMenuReel(reel)} className="w-11 h-11 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </motion.button>

                {/* Spinning disc */}
                <div className="relative w-11 h-11 rounded-full border border-white/30 overflow-hidden animate-spin-slow shadow-lg">
                  <img src={reelAvatar} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Music className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-24 left-5 right-20 z-30 flex flex-col gap-2">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => reel.profiles?.id && navigate('/profile/' + reel.profiles.id)}
                >
                  <span className="text-sm font-bold text-white drop-shadow-md">@{reelUsername}</span>
                  {!isOwn && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollow(reel.profiles?.id); }}
                      className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all ${isFollowing ? 'border-white/40 text-white/80 bg-white/10' : 'border-primary text-primary bg-primary/10'}`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
                {reel.caption && <p className="text-xs text-white/90 drop-shadow-md line-clamp-2 leading-relaxed">{reel.caption}</p>}
                {reel.is_duet && reel.duet_of && (
                  <div className="flex items-center gap-1 text-[10px] text-white/60">
                    <Repeat2 className="w-3 h-3" />
                    <span>Remix</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 w-fit mt-1">
                  <Music className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-white max-w-[170px] truncate">
                    {reel.audio_name || `Original Audio · ${reelDisplayName}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments sheet */}
      <AnimatePresence>
        {showComments && (
          <div className="absolute inset-0 z-50">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowComments(null)} />
            <motion.div className="absolute bottom-0 left-0 right-0 z-10 bg-surface-container rounded-t-3xl max-h-[75%] flex flex-col p-6" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-white uppercase tracking-wider">Comments</h3>
                <button onClick={() => setShowComments(null)} className="text-xs text-white/60 hover:text-white font-semibold">Close</button>
              </div>
              <div className="flex-grow overflow-y-auto space-y-4 py-2">
                {loadingComments ? (
                  <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : (reelComments[showComments] || []).length === 0 ? (
                  <div className="text-center py-8 text-sm text-white/40">No comments yet.</div>
                ) : (
                  (reelComments[showComments] || []).map((cmt: any) => (
                    <div key={cmt.id} className="flex gap-3 text-sm items-start border-b border-white/5 pb-3">
                      <div
                        className="w-8 h-8 rounded-full bg-primary/25 border border-primary/20 flex items-center justify-center font-bold text-xs uppercase text-primary shrink-0 cursor-pointer"
                        onClick={() => cmt.profiles?.id && navigate('/profile/' + cmt.profiles.id)}
                      >
                        {(cmt.profiles?.display_name || cmt.profiles?.username || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{cmt.profiles?.display_name || cmt.profiles?.username || 'Unknown'}</div>
                        <p className="text-white/85 text-xs mt-1 leading-relaxed break-words">{cmt.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-white/10 pt-4 mt-2 flex gap-3 items-center">
                <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-white/10 outline-none text-sm text-white rounded-full px-4 py-2.5 border border-white/15 focus:border-primary" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} disabled={!commentInput.trim()} className="w-10 h-10 bg-primary disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3-dot menu */}
      <BottomSheetMenu isOpen={!!menuReel} onClose={() => setMenuReel(null)} items={menuReel ? buildMenuItems(menuReel) : []} />

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="absolute inset-0 z-[60] flex items-end">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} />
            <motion.div className="relative w-full bg-surface-container rounded-t-3xl p-6 flex flex-col gap-4" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <h3 className="text-base font-bold text-white text-center">Delete this reel?</h3>
              <p className="text-sm text-white/60 text-center">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl border border-white/20 text-white font-semibold text-sm">Cancel</button>
                <button onClick={() => handleDeleteReel(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report modal */}
      {reportReelId && currentUserId && (
        <ReportModal isOpen={showReportModal} onClose={() => { setShowReportModal(false); setReportReelId(null); }} reportedId={reportReelId} reportType="reel" reporterId={currentUserId} />
      )}
    </div>
  );
}
