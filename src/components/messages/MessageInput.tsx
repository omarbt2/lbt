import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Paperclip, Smile, Mic, MicOff, Send, ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendMessage } from '../../lib/api/messages';
import type { Chat } from '../../types';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface MessageInputProps {
  activeChat: Chat;
  typeInput: string;
  isRecording: boolean;
  recordingDuration: number;
  replyToMessage: { id: string; senderName: string; text?: string } | null;
  showEmojiPicker: boolean;
  onTypeInputChange: (value: string) => void;
  onToggleEmojiPicker: () => void;
  onSendMessage: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearReply: () => void;
  onEmitTyping: () => void;
  onAttachmentSent: (msg: any) => void;
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  (
    {
      activeChat,
      typeInput,
      isRecording,
      recordingDuration,
      replyToMessage,
      showEmojiPicker,
      onTypeInputChange,
      onToggleEmojiPicker,
      onSendMessage,
      onStartRecording,
      onStopRecording,
      onClearReply,
      onEmitTyping,
      onAttachmentSent,
    },
    ref
  ) => {
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeChat) return;
      const ext = file.name.split('.').pop();
      const isVideo = file.type.startsWith('video/');
      const path = `messages/${activeChat.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('messages-media').upload(path, file);
      if (error) { console.error(error); return; }
      const { data: { publicUrl } } = supabase.storage.from('messages-media').getPublicUrl(path);
      try {
        const msg = await sendMessage(activeChat.id, '', {
          messageType: isVideo ? 'video' : 'image',
          mediaUrl: publicUrl,
        } as any);
        onAttachmentSent(msg);
      } catch (err) {
        console.error('Failed to send attachment:', err);
      }
    };

    return (
      <footer className="p-4 bg-transparent border-t border-outline-variant/30 shrink-0">
        <div className="bg-surface-container-lowest/95 dark:bg-surface-container/95 border border-outline-variant/30 backdrop-blur-md rounded-full flex items-center p-1.5 gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0" aria-label="Attach file">
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          {!isRecording && (
            <button
              onClick={onToggleEmojiPicker}
              className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
              title="Emoji"
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
          )}

          {!isRecording && (
            <label className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-highest cursor-pointer shrink-0" title="Send image or video">
              <ImageIcon className="w-4 h-4 text-outline" />
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}

          {isRecording ? (
            <div className="flex-1 flex items-center gap-2 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
              <span className="text-xs font-bold text-error">{formatDuration(recordingDuration)}</span>
              <div className="flex-1 flex items-center gap-[2px] h-6">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-error/30 rounded-full animate-pulse"
                    style={{
                      height: `${Math.sin(Date.now() / 200 + i) * 50 + 50}%`,
                      animationDelay: `${i * 30}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <input
              ref={ref}
              type="text"
              value={typeInput}
              onChange={(e) => {
                onTypeInputChange(e.target.value);
                onEmitTyping();
              }}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
              className="flex-1 bg-transparent border-none text-[15px] text-on-surface py-2 focus:ring-0 outline-none placeholder:text-outline-variant"
            />
          )}

          {/* Reply button (shown when replyToMessage is set but no text typed yet) */}
          {replyToMessage && !typeInput && !isRecording && (
            <button
              onClick={onSendMessage}
              className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 fill-white text-white ml-0.5" />
            </button>
          )}

          {/* Microphone / Send toggle */}
          {!typeInput.trim() && !isRecording && !replyToMessage ? (
            <button
              onMouseDown={onStartRecording}
              onMouseUp={onStopRecording}
              onMouseLeave={() => { if (isRecording) onStopRecording(); }}
              onTouchStart={onStartRecording}
              onTouchEnd={onStopRecording}
              className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
              title="Hold to record voice message"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>
          ) : isRecording ? (
            <button
              onClick={onStopRecording}
              className="w-10 h-10 bg-error text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 animate-pulse"
              aria-label="Stop recording"
            >
              <MicOff className="w-4 h-4" />
            </button>
          ) : (
            <motion.button
              onClick={onSendMessage}
              disabled={!typeInput.trim()}
              whileTap={{ scale: 0.88, rotate: 12 }}
              className="w-10 h-10 bg-primary disabled:opacity-40 text-white rounded-full flex items-center justify-center shadow-md transition-all shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 fill-white text-white ml-0.5" />
            </motion.button>
          )}
        </div>
      </footer>
    );
  }
);

MessageInput.displayName = 'MessageInput';

export default React.memo(MessageInput);
