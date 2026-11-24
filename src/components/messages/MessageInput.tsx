/* Uiverse-inspired composer supplied by the project owner.
 * The voice interaction records and sends a voice note only; it never starts a call.
 */
import React, { forwardRef, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, FolderOpen, Mic, Send, Smile, X } from 'lucide-react';
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
  isVoiceProcessing: boolean;
  voiceProcessingLabel: string;
  recordingDuration: number;
  replyToMessage: { id: string; senderName: string; text?: string } | null;
  showEmojiPicker: boolean;
  onTypeInputChange: (value: string) => void;
  onToggleEmojiPicker: () => void;
  onSendMessage: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onClearReply: () => void;
  onEmitTyping: () => void;
  onAttachmentSent: (msg: any) => void;
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({ activeChat, typeInput, isRecording, isVoiceProcessing, voiceProcessingLabel, recordingDuration,
    onTypeInputChange, onToggleEmojiPicker, onSendMessage, onStartRecording,
    onStopRecording, onCancelRecording, onEmitTyping, onAttachmentSent }, ref) => {
    const cameraPickerRef = useRef<HTMLInputElement>(null);
    const folderPickerRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      setUploadError(null);
      if (!file || !activeChat) return;
      if (!file.type.startsWith('image/')) {
        setUploadError('Please choose an image file.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError('Images must be 15 MB or smaller.');
        return;
      }
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Sign in again before attaching an image.');
        const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const path = `${user.id}/${activeChat.id}/${Date.now()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('chat-media')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (storageError) throw storageError;
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
        const msg = await sendMessage(activeChat.id, '', { messageType: 'image', mediaUrl: publicUrl });
        onAttachmentSent(msg);
      } catch (err: any) {
        console.error('Image attachment failed:', err);
        setUploadError(err?.message || 'Could not attach this image. Please try again.');
      }
    };

    const hasText = !!typeInput.trim();
    const canSend = hasText;

    return (
      <footer className="lbt-chat-composer-footer">
        <div className={`container-ia-chat lbt-chat-composer ${isRecording ? 'is-recording' : ''}`}>
          <input ref={cameraPickerRef} type="file" accept="image/*" capture="environment"
            className="lbt-composer-file-input" onChange={handleImageUpload} tabIndex={-1} aria-hidden="true" />
          <input ref={folderPickerRef} type="file" accept="image/*"
            className="lbt-composer-file-input" onChange={handleImageUpload} tabIndex={-1} aria-hidden="true" />

          <input
            ref={ref}
            type="text"
            name="input-text"
            value={typeInput}
            placeholder="Message..."
            className="input-text"
            required
            aria-label="Write a message"
            onChange={(e) => { onTypeInputChange(e.target.value); onEmitTyping(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={isRecording}
          />

          <div className="container-upload-files" aria-label="Message attachments">
            <button type="button" className="upload-file lbt-camera-trigger" title="Take a photo" aria-label="Take a photo"
              onClick={() => cameraPickerRef.current?.click()} disabled={isRecording || isVoiceProcessing}><Camera /></button>
            <button type="button" className="upload-file lbt-browse-trigger" title="Browse files" aria-label="Browse files"
              onClick={() => folderPickerRef.current?.click()} disabled={isRecording || isVoiceProcessing}><FolderOpen /></button>
          </div>

          <button type="button" className="lbt-emoji-trigger" aria-label="Open emoji picker" title="Emoji"
            onClick={onToggleEmojiPicker} disabled={isRecording || isVoiceProcessing}><Smile /></button>

          {!canSend && (
            <button
              type="button"
              className={`label-voice ${isRecording ? 'is-recording' : ''}`}
              aria-label={isRecording ? 'Send voice message' : 'Start voice message'}
              title={isRecording ? 'Tap to send voice message' : isVoiceProcessing ? voiceProcessingLabel : 'Tap to start recording'}
              disabled={!isRecording && isVoiceProcessing}
              aria-busy={!isRecording && isVoiceProcessing}
              onClick={() => isRecording ? onStopRecording() : onStartRecording()}
            >
              {isRecording ? (
                <span className="lbt-recording-content">
                  <span className="lbt-recording-dot" />
                  <span className="lbt-recording-copy">
                    <strong>Recording voice message</strong>
                    <small>Tap to send · {formatDuration(recordingDuration)}</small>
                  </span>
                  <Send className="lbt-recording-stop-icon" />
                </span>
              ) : isVoiceProcessing ? <span className="lbt-voice-processing-label">{voiceProcessingLabel}</span> : <Mic className="icon-voice" />}
            </button>
          )}
          {isRecording && (
            <button type="button" className="lbt-recording-cancel" onClick={onCancelRecording} aria-label="Cancel recording" title="Cancel recording">
              <X />
            </button>
          )}

          {canSend && !isRecording && (
            <motion.button type="button" className="label-text" aria-label="Send message" title="Send message"
              onClick={onSendMessage} disabled={!canSend} whileTap={{ scale: 0.9 }}>
              <Send />
            </motion.button>
          )}
        </div>
        {uploadError && <p className="lbt-composer-error" role="alert">{uploadError}</p>}
      </footer>
    );
  }
);

MessageInput.displayName = 'MessageInput';
export default React.memo(MessageInput);
