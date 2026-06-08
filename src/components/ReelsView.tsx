import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Plus, Bookmark, ArrowLeft, Eye, Link as LinkIcon, Flag, Copy, Bookmark as BookmarkIcon } from 'lucide-react';
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
    <div className="relative h-screen w-full bg-surface-container-lowest flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Loading reels</span>
      </div>
    </div>
  );
}

export default function ReelsView({ onBackToFeed }: ReelsViewProps) {
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [reelLikesCount, setReelLikesCount] = useState<Record<string, number>>({});
  const [doubleTapPos, setDoubleTapPos] = useState<{ x: number; y: number } | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; user: string } | null>(null);
  const [menuReel, setMenuReel] = useState<any>(null);
  const [heartBurst, setHeartBurst] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReelId, setReportReelId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
  const cycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackSpeed) + 1) % SPEED_OPTIONS.length;
    const next = SPEED_OPTIONS[nextIdx];
    setPlaybackSpeed(next);
    const video = videoRefs.current.get(activeIdx);
    if (video) video.playbackRate = next;
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)($|\?)/i.test(url);

  useEffect(() => {
    const fetchReels = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, caption, media_urls, media_type, likes_count, comments_count, created_at, profiles(*)')
        .not('media_urls', 'is', null)
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setReels(data);
        const initialCounts: Record<string, number> = {};
        data.forEach((r: any) => { initialCounts[r.id] = r.likes_count ?? 0; });
        setReelLikesCount(initialCounts);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const ids = data.map((r: any) => r.id);
          const { data: likedData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', ids);
          const likedMap: Record<string, boolean> = {};
          (likedData || []).forEach((l: any) => { likedMap[l.post_id] = true; });
          setLikedReels(likedMap);
        }
      }
      setIsLoadingReels(false);
    };
    fetchReels();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-reel-index'));
          const video = videoRefs.current.get(idx);
          if (!video) return;

          if (entry.isIntersecting) {
            setActiveIdx(idx);
            video.currentTime = 0;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    const children = containerRef.current.querySelectorAll('[data-reel-index]');
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [reels]);

  const handleLike = async (id: string) => {
    const isLiked = likedReels[id] ?? false;
    setLikedReels(prev => ({ ...prev, [id]: !isLiked }));
    setReelLikesCount(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1)),
    }));
    if (!isLiked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      if (!isLiked) {
        await supabase.from('likes').insert({ post_id: id, user_id: user.id });
      } else {
        await supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id);
      }
    } catch {
      setLikedReels(prev => ({ ...prev, [id]: isLiked }));
      setReelLikesCount(prev => ({
        ...prev,
        [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)),
      }));
    }
  };

  const handleDoubleTap = (e: React.MouseEvent, reelId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDoubleTapPos({ x, y });
    setTimeout(() => setDoubleTapPos(null), 800);
    if (!(likedReels[reelId] ?? false)) {
      handleLike(reelId);
    }
  };

  const loadComments = async (postId: string) => {
    if (reelComments[postId]) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(20);
    if (data) {
      setReelComments((prev) => ({ ...prev, [postId]: data }));
    }
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !reels[activeIdx]) return;
    const text = commentInput.trim();
    const reelId = reels[activeIdx].id;
    const tempId = `comment_${Date.now()}`;

    const newComment: any = {
      id: tempId,
      content: text,
      created_at: new Date().toISOString(),
      profiles: { display_name: 'You', name: 'You', username: 'you' },
    };
    setReelComments(prev => ({
      ...prev,
      [reelId]: [...(prev[reelId] || []), newComment],
    }));
    setCommentInput('');
    setReplyingTo(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: reelId, user_id: user.id, content: text })
        .select('*, profiles(*)')
        .single();
      if (!error && data) {
        setReelComments(prev => ({
          ...prev,
          [reelId]: (prev[reelId] || []).map(c => c.id === tempId ? data : c),
        }));
      }
    } catch {
      setReelComments(prev => ({
        ...prev,
        [reelId]: (prev[reelId] || []).filter(c => c.id !== tempId),
      }));
    }
  };

  const getCommentCount = (reelId: string) => (reelComments[reelId] || []).length;

  const menuItems: BottomSheetMenuItem[] = menuReel
    ? [
        { icon: <BookmarkIcon className="w-5 h-5" />, label: 'Save', onClick: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            try { await supabase.from('saved_posts').insert({ user_id: user.id, post_id: menuReel.id }); } catch (_) {}
          }
          setMenuReel(null);
        }},
        { icon: <Send className="w-5 h-5" />, label: 'Share', onClick: async () => {
          const url = `${window.location.origin}?post=${menuReel.id}`;
          if (navigator.share) {
            try { await navigator.share({ title: menuReel.caption, url }); } catch (_) {}
          } else {
            await navigator.clipboard.writeText(url);
          }
          setMenuReel(null);
        }},
        { icon: <Copy className="w-5 h-5" />, label: 'Copy Link', onClick: async () => {
          const url = `${window.location.origin}?post=${menuReel.id}`;
          await navigator.clipboard.writeText(url);
          setMenuReel(null);
        }},
        { icon: <Flag className="w-5 h-5" />, label: 'Report Reel', onClick: () => {
          setReportReelId(menuReel.id);
          setShowReportModal(true);
          setMenuReel(null);
        }, destructive: true },
      ]
    : [];

  if (isLoadingReels) return <ReelSkeleton />;

  if (!reels.length) {
    return (
      <div className="relative h-screen bg-surface-container-lowest w-full flex flex-col items-center justify-center text-white gap-4">
        <p className="text-sm text-white/60">No reels available</p>
        <button onClick={onBackToFeed} className="text-xs font-bold text-primary hover:underline">
          ← Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-surface-container-lowest" id="reels_screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onBackToFeed}
            className="font-bold text-sm tracking-tight text-white hover:text-primary transition-colors flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> LBT
          </button>
        </div>
        <h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">Reels</h1>
        <div className="w-14" />
      </header>

      {/* Vertical snap scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, idx) => {
          const reelImageUrl = reel.media_urls?.[0] ?? '';
          const reelAvatar = reel.profiles?.avatar_url
            ?? getDefaultAvatar(reel.profiles?.id || '');
          const reelUsername = reel.profiles?.username ?? 'unknown';
          const reelDisplayName = reel.profiles?.display_name ?? reel.profiles?.name ?? reelUsername;
          const isActive = idx === activeIdx;

          return (
            <div
              key={reel.id}
              data-reel-index={idx}
              className="relative h-screen w-full snap-start snap-always flex items-center justify-center"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Background media */}
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black"
                onClick={(e) => handleDoubleTap(e, reel.id)}
              >
                {isVideoUrl(reelImageUrl) ? (
                  <video
                    ref={(el) => { if (el) { videoRefs.current.set(idx, el); el.playbackRate = playbackSpeed; } }}
                    src={reelImageUrl}
                    className="w-full h-full object-contain bg-black"
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={reelImageUrl}
                    alt={reel.caption || 'Reel'}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                {/* Double-tap heart animation */}
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

              {/* Progress bar */}
              <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-0 right-0 z-40 px-4">
                <div className="h-[2.5px] rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-[width] duration-100 ease-linear"
                    style={{ width: isActive ? '100%' : '0%', animation: isActive ? `progressFill 5s linear` : 'none' }}
                  />
                </div>
              </div>

              {/* Side action buttons */}
              <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
                {/* Avatar + follow */}
                <div className="relative mb-2 cursor-pointer group">
                  <div className="w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-tr from-primary to-primary shadow-[0_0_12px_rgba(26,39,68,0.4)] group-hover:scale-105 transition-transform">
                    <img src={reelAvatar} alt="" className="w-full h-full rounded-full object-cover border-2 border-black" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center border border-black shadow">
                    <Plus className="w-3.5 h-3.5 font-bold" />
                  </div>
                </div>

                {/* Like */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handleLike(reel.id)}
                  className="flex flex-col items-center gap-1.5 text-white"
                >
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all ${
                    likedReels[reel.id]
                      ? 'bg-error border-error fill-error shadow-[0_0_15px_rgba(255,59,48,0.4)]'
                      : 'bg-black/25 border-white/10 backdrop-blur-md hover:bg-black/45'
                  }`}>
                    <Heart className={`w-5.5 h-5.5 drop-shadow-lg ${likedReels[reel.id] ? 'fill-white text-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">
                    {reelLikesCount[reel.id] ?? reel.likes_count ?? 0}
                  </span>
                </motion.button>

                {/* Comment */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => {
                    setReplyingTo(null);
                    const newId = showComments === reel.id ? null : reel.id;
                    setShowComments(newId);
                    if (newId) loadComments(newId);
                  }}
                  className="flex flex-col items-center gap-1.5 text-white"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full hover:bg-black/45">
                    <MessageCircle className="w-5.5 h-5.5 drop-shadow-lg" />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">{getCommentCount(reel.id)}</span>
                </motion.button>

                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col items-center gap-1.5 text-white"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full hover:bg-black/45">
                    <Send className="w-5.5 h-5.5 drop-shadow-lg" />
                  </div>
                  <span className="text-[11px] font-bold text-white drop-shadow-md">Share</span>
                </motion.button>

                {/* More */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setMenuReel(reel)}
                  className="w-11 h-11 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full text-white hover:bg-black/45 transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </motion.button>

                {/* Speed control */}
                {isVideoUrl(reelImageUrl) && (
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    transition={{ duration: 0.1 }}
                    onClick={cycleSpeed}
                    className="w-11 h-11 flex items-center justify-center bg-black/25 border border-white/10 backdrop-blur-md rounded-full text-white hover:bg-black/45 transition-colors"
                  >
                    <span className="text-[10px] font-bold">{playbackSpeed}x</span>
                  </motion.button>
                )}

                {/* Spinning disc */}
                <div className="relative w-11 h-11 rounded-full border border-white/30 overflow-hidden animate-spin-slow shadow-lg">
                  <img src={reelAvatar} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
                    <Music className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
              </div>

              {/* Bottom overlay info */}
              <div className="absolute bottom-24 left-5 right-20 z-30 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white drop-shadow-md">@{reelUsername}</h2>
                  <span className="bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider text-white">
                    Creative
                  </span>
                </div>
                <p className="text-xs text-white/90 drop-shadow-md line-clamp-2 leading-relaxed">{reel.caption}</p>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 w-fit mt-1">
                  <Music className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap max-w-[170px]">
                    Original Sound - {reelDisplayName}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments bottom sheet */}
      <AnimatePresence>
      {showComments && (
        <div className="absolute inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { setShowComments(null); setReplyingTo(null); }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 bg-surface-container rounded-t-3xl max-h-[75%] flex flex-col p-6"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold text-white uppercase tracking-wider">
                Comments ({getCommentCount(showComments)})
              </h3>
              <button
                onClick={() => { setShowComments(null); setReplyingTo(null); }}
                className="text-xs text-white/60 hover:text-white font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 py-2 hover:no-scrollbar">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (reelComments[showComments] || []).length === 0 ? (
                <div className="text-center py-8 text-sm text-white/40">No comments yet. Be the first!</div>
              ) : (
                (reelComments[showComments] || []).map((cmt: any) => (
                  <div key={cmt.id} className="space-y-3.5 animate-fadeIn border-b border-white/5 pb-3">
                    <div className="flex gap-3 text-sm items-start">
                      <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/20 flex items-center justify-center font-bold text-xs uppercase text-primary shrink-0 shadow-sm">
                        {(cmt.profiles?.display_name || cmt.profiles?.name || cmt.profiles?.username || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-grow">
                        <div className="font-semibold text-white text-xs md:text-sm">
                          {cmt.profiles?.display_name || cmt.profiles?.name || cmt.profiles?.username || 'Unknown'}
                        </div>
                        <p className="text-white/85 text-xs md:text-sm mt-1 leading-relaxed break-words">{cmt.content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider">
                            {(() => {
                              const m = Math.floor((Date.now() - new Date(cmt.created_at).getTime()) / 60000);
                              return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
                            })()}
                          </span>
                          <button
                            onClick={() => setReplyingTo({ id: cmt.id, user: cmt.profiles?.display_name || cmt.profiles?.name || 'user' })}
                            className="text-[10px] font-black text-primary hover:text-primary select-none cursor-pointer tracking-wider uppercase transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {replyingTo && (
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 mb-2 text-xs text-white/80 animate-fadeIn">
                <span className="font-medium">
                  Replying to <span className="text-primary font-bold">@{replyingTo.user}</span>
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-[10px] uppercase font-bold text-white/40 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 mt-2 flex gap-3 items-center">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.user}...` : 'Add a comment...'}
                className="flex-1 bg-white/10 outline-none text-sm text-white rounded-full px-4 py-2.5 border border-white/15 focus:border-primary focus:bg-white/15"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentInput.trim()}
                className="w-10 h-10 bg-primary disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* 3-dot menu bottom sheet */}
      <BottomSheetMenu
        isOpen={!!menuReel}
        onClose={() => setMenuReel(null)}
        items={menuItems}
      />

      {/* Report modal */}
      {reportReelId && currentUserId && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => { setShowReportModal(false); setReportReelId(null); }}
          reportedId={reportReelId}
          reportType="reel"
          reporterId={currentUserId}
        />
      )}

      {/* CSS animation for progress bar */}
      <style>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
