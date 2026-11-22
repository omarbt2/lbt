/* From Uiverse.io by Uiverse — adapted for LBT Social chat messages.
 * Original input pattern supplied by the project owner; voice control is a voice-note recorder only.
 */
import React, { forwardRef, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Folder, Image as ImageIcon, Mic, MicOff, Plus, Send, Smile } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendMessage } from '../../lib/api/messages';
import type { Chat } from '../../types';
import './MessageInput.css';

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
      onTypeInputChange,
      onToggleEmojiPicker,
      onSendMessage,
      onStartRecording,
      onStopRecording,
      onEmitTyping,
      onAttachmentSent,
    },
    ref
  ) => {
    const imagePickerRef = useRef<HTMLInputElement>(null);
    const cameraPickerRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !activeChat) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 15 * 1024 * 1024) {
        console.error('Image is larger than the 15 MB message limit.');
        return;
      }

      const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
      const path = `messages/${activeChat.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('messages-media')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        console.error('Image upload failed:', uploadError);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('messages-media').getPublicUrl(path);
      try {
        const msg = await sendMessage(activeChat.id, '', {
          messageType: 'image',
          mediaUrl: publicUrl,
        });
        onAttachmentSent(msg);
      } catch (err) {
        console.error('Failed to send image:', err);
      }
    };

    const startVoiceNote = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!isRecording) onStartRecording();
    };

    const stopVoiceNote = () => {
      if (isRecording) onStopRecording();
    };

    return (
      <footer className="lbt-chat-composer-footer">
        <div className={`container-ia-chat lbt-chat-composer ${isRecording ? 'is-recording' : ''}`}>
          <input
            ref={cameraPickerRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="lbt-composer-file-input"
            onChange={handleImageUpload}
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={imagePickerRef}
            type="file"
            accept="image/*"
            className="lbt-composer-file-input"
            onChange={handleImageUpload}
            tabIndex={-1}
            aria-hidden="true"
          />

          <input
            ref={ref}
            type="text"
            name="input-text"
            value={typeInput}
            placeholder="Message..."
            className="input-text"
            required
            aria-label="Write a message"
            onChange={(e) => {
              onTypeInputChange(e.target.value);
              onEmitTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={isRecording}
          />

          <div className="container-upload-files" aria-label="Attach an image">
            <button type="button" className="upload-file" title="Take a photo" aria-label="Take a photo" onClick={() => cameraPickerRef.current?.click()}>
              <Camera />
            </button>
            <button type="button" className="upload-file" title="Choose an image" aria-label="Choose an image" onClick={() => imagePickerRef.current?.click()}>
              <ImageIcon />
            </button>
            <button type="button" className="upload-file" title="Browse images" aria-label="Browse images" onClick={() => imagePickerRef.current?.click()}>
              <Folder />
            </button>
          </div>

          <button
            type="button"
            className="label-files"
            aria-label="Attach an image"
            title="Attach image"
            onClick={() => imagePickerRef.current?.click()}
          >
            <Plus />
          </button>

          <button
            type="button"
            className="lbt-emoji-trigger"
            aria-label="Open emoji picker"
            title="Emoji"
            onClick={onToggleEmojiPicker}
            disabled={isRecording}
          >
            <Smile />
          </button>

          {!typeInput.trim() && !replyToMessage && (
            <button
              type="button"
              className="label-voice"
              aria-label={isRecording ? 'Stop voice message recording' : 'Hold to record a voice message'}
              title={isRecording ? 'Stop recording' : 'Hold to record a voice message'}
              onPointerDown={startVoiceNote}
              onPointerUp={stopVoiceNote}
              onPointerCancel={stopVoiceNote}
              onPointerLeave={stopVoiceNote}
            >
              {isRecording ? <MicOff className="icon-voice" /> : <Mic className="icon-voice" />}
            </button>
          )}

          {(typeInput.trim() || replyToMessage) && !isRecording && (
            <motion.button
              type="button"
              className="label-text"
              aria-label="Send message"
              title="Send message"
              onClick={onSendMessage}
              disabled={!typeInput.trim() && !replyToMessage}
              whileTap={{ scale: 0.9 }}
            >
              <Send />
            </motion.button>
          )}

          {isRecording && (
            <div className="lbt-recording-status" role="status">
              <span className="lbt-recording-dot" />
              Recording voice message · {formatDuration(recordingDuration)}
            </div>
          )}
        </div>
      </footer>
    );
  }
);

MessageInput.displayName = 'MessageInput';

export default React.memo(MessageInput);
