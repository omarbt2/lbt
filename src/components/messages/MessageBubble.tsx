import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Check, CheckCheck } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import LinkPreviewCard from '../ui/LinkPreviewCard';
import { extractUrls } from '../../lib/api/linkPreview';
import { QUICK_REACTIONS } from '../../lib/api/emojis';
import type { Message, User, Chat } from '../../types';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  currentUser: User;
  activeChat: Chat;
  playingVoiceId: string | null;
  voiceProgress: Record<string, number>;
  reactionPickerMessageId: string | null;
  onToggleVoicePlayback: (msgId: string, url: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onContextMenu: (e: React.MouseEvent, messageId: string) => void;
  onLongPressStart: (messageId: string) => void;
  onLongPressEnd: () => void;
}

function MessageBubble({
  message: m,
  isMe,
  currentUser,
  activeChat,
  playingVoiceId,
  voiceProgress,
  reactionPickerMessageId,
  onToggleVoicePlayback,
  onReaction,
  onContextMenu,
  onLongPressStart,
  onLongPressEnd,
}: MessageBubbleProps) {
  // Call history is no longer part of LBT messaging; voice notes remain supported.
  if (m.message_type === 'call') return null;

  return (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative group"
    >
      {/* Reply-to preview */}
      {m.reply_to && (
        <div className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] px-3 py-1.5 rounded-xl text-[10px] border-l-2 ${
            isMe
              ? 'bg-primary/10 border-primary text-primary/80'
              : 'bg-surface-container-high border-outline text-on-surface-variant'
          }`}>
            <span className="font-bold block truncate">{m.reply_to.senderName}</span>
            <span className="truncate block opacity-70">{m.reply_to.text || 'Media'}</span>
          </div>
        </div>
      )}

      <div
        className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
        onContextMenu={(e) => onContextMenu(e, m.id)}
        onMouseDown={() => onLongPressStart(m.id)}
        onMouseUp={onLongPressEnd}
        onMouseLeave={onLongPressEnd}
        onTouchStart={() => onLongPressStart(m.id)}
        onTouchEnd={onLongPressEnd}
      >
        {!isMe && (
          <Avatar
            src={activeChat.user.avatar}
            userId={activeChat.user.id}
            name={activeChat.user.name}
            size="xs"
            className="w-7 h-7 mt-1 shrink-0 shadow-sm"
          />
        )}

        <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Voice message */}
          {m.message_type === 'voice' && m.voice_url && (
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${
              isMe
                ? 'bg-gradient-to-tr from-primary to-primary-container text-white'
                : 'bg-surface-container-high text-on-surface'
            }`}>
              <button
                onClick={() => onToggleVoicePlayback(m.id, m.voice_url!)}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}
                aria-label={playingVoiceId === m.id ? 'Pause voice message' : 'Play voice message'}
              >
                {playingVoiceId === m.id ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              <div className="flex gap-0.5 items-center h-4">
                {Array.from({ length: 20 }).map((_, i) => {
                  const h = Math.sin(i * 0.7 + m.id.charCodeAt(0)) * 0.5 + 0.5;
                  return (
                    <div
                      key={i}
                      className="w-0.5 bg-current rounded-full"
                      style={{ height: `${Math.max(h * 14 + 2, 4)}px`, opacity: 0.7 }}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-mono">
                {m.voice_duration_seconds ? formatDuration(m.voice_duration_seconds) : '0:00'}
              </span>
            </div>
          )}

          {/* Text message */}
          {m.text && !(m.message_type === 'voice' && m.text === '[Voice Message]' && m.voice_url) && (
            <div className={`px-4 py-2.5 rounded-2xl text-[15px] font-semibold leading-relaxed shadow-sm text-left ${
              isMe
                ? 'bg-gradient-to-tr from-primary to-primary-container text-white rounded-tr-none'
                : 'bg-surface-container-high text-on-surface rounded-tl-none'
            }`}>
              {m.text}
            </div>
          )}

          {/* Image message */}
          {m.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant bg-surface p-1 shadow-sm max-w-xs">
              <img src={m.imageUrl} alt="Shared" className="w-full h-auto rounded-xl cursor-pointer" onClick={() => window.open(m.imageUrl, '_blank')} />
            </div>
          )}

          {/* Video message */}
          {(m as any).message_type === 'video' && (m as any).video_url && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant bg-surface p-1 shadow-sm max-w-[220px]">
              <video src={(m as any).video_url} controls className="w-full rounded-xl" />
            </div>
          )}

          {/* GIF message */}
          {m.message_type === 'gif' && m.gif_url && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-sm max-w-[200px]">
              <img src={m.gif_url} alt="GIF" className="w-full h-auto rounded-2xl" loading="lazy" />
            </div>
          )}

          {/* Shared post preview */}
          {m.message_type === 'post_share' && m.shared_post && (
            <div
              className="border rounded-xl p-2 max-w-xs cursor-pointer hover:bg-surface-container/50 transition-colors"
              onClick={() => {
                if (m.shared_post?.id) window.location.href = `/post/${m.shared_post.id}`;
              }}
            >
              {m.shared_post.image_url && (
                <img
                  src={m.shared_post.image_url}
                  alt="Shared post"
                  className="rounded-lg w-full aspect-square object-cover"
                />
              )}
              {m.shared_post.caption && (
                <p className="text-xs mt-1 truncate text-on-surface-variant">
                  {m.shared_post.caption}
                </p>
              )}
            </div>
          )}

          {/* Link preview for URLs in text messages */}
          {m.text && (() => {
            const urls = extractUrls(m.text);
            return urls.length > 0 ? (
              <div className="mt-1">
                <LinkPreviewCard url={urls[0]} />
              </div>
            ) : null;
          })()}

          {/* Reactions badge row */}
          {m.reactions && m.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(
                m.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(m.id, emoji)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
                    m.reactions!.some(r => r.user_id === currentUser.id && r.emoji === emoji)
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-surface-container-high border-outline-variant/50 text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="font-bold">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Time + read receipt */}
          <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-[9px] font-bold text-outline">{m.timeLabel}</span>
            {isMe && (
              m.is_seen ? (
                 <CheckCheck className="w-3.5 h-3.5 text-primary" />
              ) : m.isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-outline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-outline" />
              )
            )}
          </div>
        </div>
      </div>

      {/* Reaction picker popup */}
      <AnimatePresence>
      {reactionPickerMessageId === m.id && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className={`absolute z-30 flex gap-1 bg-surface-container-lowest/95 dark:bg-surface-container/95 backdrop-blur-md rounded-full px-2 py-1.5 shadow-xl border border-outline-variant/30 ${
            isMe ? 'right-0' : 'left-10'
          } -top-10`}
        >
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(m.id, emoji);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:bg-surface-container-high hover:scale-125 transition-all active:scale-95"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(MessageBubble);
