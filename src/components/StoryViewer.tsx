import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Eye, Send, Pause, Play, Volume2, VolumeX, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story, User } from '../types';
import { StoryGroup, recordStoryView, getStoryViewers } from '../lib/api/stories';
import { supabase } from '../lib/supabase';
import BottomSheetMenu from './ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './ui/BottomSheetMenu';
import ReportModal from './ReportModal';
import { Avatar } from './ui/Avatar';
import { getDefaultAvatar } from '../lib/defaultAvatars';
import { IconTrash, IconEye, IconFlag } from './ui/MenuIcons';

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
}

const STORY_DURATION_MS = 5000;
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export default function StoryViewer({ groups, initialGroupIndex, currentUserId, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; username: string; avatar_url: string | null; display_name: string | null }[]>([]);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showStoryMenu, setShowStoryMenu] = useState(false);
  const [flyingEmoji, setFlyingEmoji] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef<number>(0);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwner = story?.user.id === currentUserId;
  const isVideo = story?.media_type === 'video';

  const duration = isVideo ? (videoRef.current?.duration || 15) * 1000 : STORY_DURATION_MS;

  useEffect(() => {
    if (!story) return;
    recordStoryView(story.id).catch(() => {});
  }, [story?.id]);

  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [storyIdx, groupIdx]);

  useEffect(() => {
    if (isPaused || isVideo) return;
    const start = Date.now();
    const remaining = duration * (1 - progress);

    const tick = () => {
      const elapsed = Date.now() - start;
      const newProgress = progress + elapsed / duration;
      if (newProgress >= 1) {
        goNext();
        return;
      }
      setProgress(newProgress);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, progress, groupIdx, storyIdx]);

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const vid = videoRef.current;

    const handleTimeUpdate = () => {
      if (vid.duration) {
        setProgress(vid.currentTime / vid.duration);
      }
    };
    const handleEnded = () => goNext();

    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('ended', handleEnded);
    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('ended', handleEnded);
    };
  }, [isVideo, groupIdx, storyIdx]);

  useEffect(() => {
    if (!showViewers || !story) return;
    getStoryViewers(story.id).then(setViewers);
  }, [showViewers, story?.id]);

  const goNext = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(prev => prev + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(prev => prev + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, group, groups, onClose]);

  const goPrev = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (storyIdx > 0) {
      setStoryIdx(prev => prev - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx(prev => prev - 1);
      const prevGroup = groups[groupIdx - 1];
      setStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIdx, groupIdx, groups]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    if (dy > 30) {
      setDragY(Math.min(dy, 200));
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 120) {
      onClose();
    } else {
      setDragY(0);
      setIsDragging(false);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap — could add like animation here
    }
    lastTapRef.current = now;
  };

  const handleVideoToggle = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  const sendReaction = async (storyId: string, emoji: string) => {
    setFlyingEmoji(emoji);
    setTimeout(() => setFlyingEmoji(null), 800);
    try {
      await (supabase.from as any)('story_replies').insert({
        story_id: storyId,
        user_id: currentUserId,
        reply_type: 'reaction',
        content: emoji,
      });
    } catch {
      // Silently fail if table doesn't exist
    }
  };

  if (!group || !story) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
      style={{ transform: `translateY(${dragY}px)`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        {group.stories.map((s, i) => {
          const isActive = i === storyIdx;
          const isPast = i < storyIdx;
          return (
            <div key={s.id} className="flex-1 h-[2.5px] rounded-full bg-white/30 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: isPast ? '100%' : isActive ? `${progress * 100}%` : '0%' }}
                transition={isActive ? { duration: 0, ease: 'linear' } : { duration: 0 }}
              />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-2">
        <div className="flex items-center gap-3">
          <Avatar
            src={story.user.avatar}
            userId={story.user.id}
            name={story.user.username}
            size="sm"
            className="w-9 h-9 border-2 border-white/80"
          />
          <div>
            <span className="text-xs font-bold text-white">{story.user.username}</span>
            <span className="text-[10px] text-white/60 ml-2">{timeAgo(story.created_at || '')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isVideo && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
              className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1"
            >
              <Eye className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-bold text-white">{story.views_count || 0}</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowStoryMenu(true); }}
            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Media content */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${groupIdx}-${storyIdx}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
        {isVideo ? (
          <video
            ref={videoRef}
            src={story.media_url}
            className="w-full h-full object-contain bg-black"
            playsInline
            muted={isMuted}
            autoPlay
          />
        ) : (
          <img
            src={story.media_url}
            alt="Story"
            className="w-full h-full object-contain bg-black"
            draggable={false}
          />
        )}
          </motion.div>
        </AnimatePresence>

        {/* Video play/pause overlay */}
        {isVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); handleVideoToggle(); }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isPaused && (
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-scaleUp">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Caption overlay */}
      {story.caption && (
        <div className="absolute bottom-24 left-0 right-0 z-40 px-6 text-center pointer-events-none">
          <p className="text-sm font-semibold text-white drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            {story.caption}
          </p>
        </div>
      )}

      {/* Flying emoji animation */}
      <AnimatePresence>
        {flyingEmoji && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]"
            initial={{ opacity: 1, y: 0, scale: 1.5 }}
            animate={{ opacity: 0, y: -200, scale: 2.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="text-5xl">{flyingEmoji}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom reply bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {/* Emoji reaction bar */}
        <div className="flex gap-3 justify-center pb-4">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendReaction(story.id, emoji)}
              className="text-2xl active:scale-125 transition-transform hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to story..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors"
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
          </div>
          {replyText.trim() ? (
            <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform">
              <Send className="w-4 h-4 text-white ml-0.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Viewers bottom sheet */}
      {showViewers && (
        <div className="absolute inset-0 z-[60]" onClick={() => setShowViewers(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-3xl max-h-[60vh] overflow-hidden animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-outline-variant" />
            </div>
            <div className="px-5 pb-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">{story.views_count || 0} views</h3>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[45vh] p-4 space-y-3">
              {viewers.length === 0 ? (
                <p className="text-xs text-outline text-center py-6">No views yet</p>
              ) : (
                viewers.map(v => (
                  <div key={v.id} className="flex items-center gap-3">
                    <img
                      src={v.avatar_url || getDefaultAvatar(v.id)}
                      alt={v.username}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-on-surface">{v.display_name || v.username}</p>
                      <p className="text-[10px] text-outline">@{v.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomSheetMenu
        isOpen={showStoryMenu}
        onClose={() => setShowStoryMenu(false)}
        items={isOwner ? [
          { icon: <IconTrash />, label: 'Delete Story', onClick: async () => {
            await supabase.from('stories').delete().eq('id', story.id);
            setShowStoryMenu(false);
            onClose();
          }, destructive: true },
          { icon: <IconEye />, label: 'View Viewers', onClick: () => { setShowStoryMenu(false); setShowViewers(true); } },
        ] : [
          { icon: <IconFlag />, label: 'Report Story', onClick: () => { setShowStoryMenu(false); setShowReportModal(true); }, destructive: true },
        ]}
        header={{
          avatar: story?.user?.avatar || undefined,
          name: story?.user?.username || '',
        }}
      />

      {story && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId={story.id}
          reportType="story"
          reporterId={currentUserId}
        />
      )}
    </div>
  );
}
