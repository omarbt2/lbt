import React, { useState, useRef, useCallback } from 'react';
import { Post, Comment, User } from '../types';
import { Heart, MessageCircle, Share, Bookmark, Send, Smile, ArrowLeft, MoreVertical, X, Flag, Ban, Copy, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import BottomSheetMenu from './ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './ui/BottomSheetMenu';
import GifPicker from './ui/GifPicker';
import type { GifResult } from './ui/GifPicker';
import ReportModal from './ReportModal';
import { Avatar } from './ui/Avatar';

interface PostDetailViewProps {
  post: Post;
  currentUser: User;
  onBack: () => void;
  onLikeToggle: (id: string) => void;
  onBookmarkToggle: (id: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => void;
}

function renderCaption(caption: string, nav: ReturnType<typeof useNavigate>) {
  if (!caption) return null;
  const parts = caption.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="text-primary cursor-pointer font-semibold hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/hashtag/${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-primary cursor-pointer font-semibold hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/profile/${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PostDetailView({
  post,
  currentUser,
  onBack,
  onLikeToggle,
  onBookmarkToggle,
  onAddComment,
  onDeletePost,
}: PostDetailViewProps) {
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const isOwnPost = post.user.id === currentUser.id;

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText;
    setCommentText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
    await onAddComment(post.id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  const handleGifSelect = async (gif: GifResult) => {
    await onAddComment(post.id, `gif:${gif.url}`);
  };

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}?post=${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.caption, url }); } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url);
      const btn = document.createElement('div');
      btn.textContent = 'Link copied!';
      btn.className = 'fixed top-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface text-xs font-bold px-4 py-2 rounded-xl shadow-lg animate-fadeIn';
      document.body.appendChild(btn);
      setTimeout(() => btn.remove(), 2000);
    }
    setShowMenu(false);
  }, [post.id, post.caption]);

  const handleDelete = useCallback(async () => {
    if (onDeletePost) {
      await onDeletePost(post.id);
    }
    setShowMenu(false);
    onBack();
  }, [onDeletePost, post.id, onBack]);

  const menuItems: BottomSheetMenuItem[] = isOwnPost
    ? [
        { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Post', onClick: () => { setShowMenu(false); } },
        { icon: <Copy className="w-5 h-5" />, label: 'Copy Link', onClick: handleCopyLink },
        { icon: <Trash2 className="w-5 h-5" />, label: 'Delete Post', onClick: handleDelete, destructive: true },
      ]
    : [
        { icon: <Flag className="w-5 h-5" />, label: 'Report Post', onClick: () => { setShowMenu(false); setShowReportModal(true); } },
        { icon: <Ban className="w-5 h-5" />, label: 'Not Interested', onClick: () => setShowMenu(false) },
        { icon: <Copy className="w-5 h-5" />, label: 'Copy Link', onClick: handleCopyLink },
      ];

  return (
    <div className="flex flex-col h-full animate-fadeIn" id="post_detail_screen">
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center px-4 py-3 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/10 shrink-0">
        <button
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <span className="text-xs font-bold text-outline">Post Detail</span>
        <div className="w-20" />
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {/* PRIMARY DETAILED CARD */}
        <article className="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/10 flex flex-col relative">
          {/* Author Row */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar
                src={post.user.avatar}
                userId={post.user.id}
                name={post.user.name}
                size="md"
                className="ring-1 ring-primary/10 shadow-sm"
              />
              <div>
                <h3 className="text-sm font-bold text-on-surface">{post.user.name}</h3>
                <p className="text-[10px] text-on-surface-variant font-medium">
                  {post.timeLabel} • in <span className="text-primary hover:underline">{post.category}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMenu(true)}
              className="p-2 hover:bg-surface-container rounded-full transition-colors"
              aria-label="Post options"
            >
              <MoreVertical className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          {/* Content Box */}
          <div className="px-4 pb-3">
            <p className="text-xs text-on-surface leading-relaxed">{renderCaption(post.caption, navigate)}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/hashtag/${tag}`)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Hero Image */}
          {post.imageUrl && (
            <div className="w-full relative aspect-square sm:aspect-[4/3] bg-surface-container overflow-hidden">
              <img
                src={post.imageUrl}
                alt="Post artwork"
                className="w-full h-full object-contain bg-black"
              />
            </div>
          )}

          {/* Action Counters Panel */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-outline-variant/10">
            <div className="flex space-x-4">
              <button
                onClick={() => onLikeToggle(post.id)}
                className="flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors group"
              >
                <Heart
                  className={`w-5 h-5 group-hover:scale-110 transition-transform duration-200 ${
                    post.hasLiked ? 'text-error fill-error' : ''
                  }`}
                />
                <span className="text-xs font-bold">{(post.likes || 0).toLocaleString()}</span>
              </button>

              <button className="flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-bold">{post.commentsList.length}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors"
                title="Share post"
                aria-label="Share post"
              >
                <Share className="w-5 h-5" />
              </button>
            </div>

              <button
                onClick={() => onBookmarkToggle(post.id)}
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label={post.hasBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
              <Bookmark
                 className={`w-5 h-5 ${post.hasBookmarked ? 'text-on-surface fill-on-surface' : ''}`}
              />
            </button>
          </div>
        </article>

        {/* COMMENTS LOG SECTION */}
        <section className="px-4 py-3">
          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Comments ({post.commentsList.length})
          </h4>

          <div className="flex flex-col gap-2.5 pb-20">
            {post.commentsList.map((cmt) => (
              <div
                key={cmt.id}
                className="bg-surface-container-low/75 backdrop-blur-md rounded-2xl p-4 flex gap-3 border border-outline-variant/30 shadow-sm"
              >
                <Avatar
                  src={cmt.user.avatar}
                  userId={cmt.user.id}
                  name={cmt.user.name}
                  size="sm"
                  className="shrink-0 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-xs font-bold text-on-surface">{cmt.user.name}</span>
                      <span className="text-[10px] text-on-surface-variant font-semibold ml-2">
                        {cmt.timeLabel}
                      </span>
                    </div>
                    <button className="text-on-surface-variant hover:text-primary shrink-0" aria-label="Like comment">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-on-surface leading-normal">{cmt.content}</p>
                </div>
              </div>
            ))}

            {post.commentsList.length === 0 && (
              <div className="text-center py-8 bg-surface-container/30 rounded-2xl border border-dashed border-outline-variant/30">
                <MessageCircle className="w-6 h-6 text-outline mx-auto opacity-30 mb-1.5" />
                <p className="text-xs text-on-surface-variant">Be the first to comment on this artwork!</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* STICKY INPUT BAR - fixed at bottom */}
      <div className="shrink-0 bg-surface-container-lowest/80 backdrop-blur-2xl border-t border-outline-variant/10 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          <Avatar
            src={currentUser.avatar}
            userId={currentUser.id}
            name={currentUser.name}
            size="sm"
            className="shrink-0 shadow-sm"
          />

          <div className="flex-1 relative flex items-end bg-surface-container rounded-2xl border border-outline-variant/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-surface-container-lowest dark:focus-within:bg-surface-container-high transition-all overflow-hidden">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Add your thought..."
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 pl-4 pr-12 text-xs text-on-surface placeholder:text-outline-variant outline-none"
            />
            <button
              onClick={() => setCommentText((prev) => `${prev} ✨`)}
              className="absolute right-3 bottom-2.5 p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full"
              title="Add Magic Sparkles"
              aria-label="Add emoji"
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setShowGifPicker(true)}
              className="absolute right-10 bottom-2.5 p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full"
              title="Add GIF"
              aria-label="Add GIF"
            >
              <span className="text-[9px] font-bold border border-outline-variant rounded px-1 py-0.5">GIF</span>
            </button>
          </div>

              <button
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="w-11 h-11 rounded-full bg-primary disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-all"
                title="Publish Comment"
                aria-label="Publish comment"
              >
            <Send className="w-4.5 h-4.5 fill-white text-white ml-0.5" />
          </button>
        </div>
      </div>

      {/* BOTTOM SHEET MENU */}
      <BottomSheetMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        items={menuItems}
        header={{
          avatar: post.user.avatar || undefined,
          name: post.user.name,
          subtitle: post.timeLabel,
        }}
      />

      {!isOwnPost && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId={post.id}
          reportType="post"
          reporterId={currentUser.id}
        />
      )}

      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleGifSelect}
      />
    </div>
  );
}
