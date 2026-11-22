import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface NoteInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string };
}

export default function NoteInputModal({ isOpen, onClose, currentUser }: NoteInputModalProps) {
  const [noteText, setNoteText] = useState('');

  const handlePost = async () => {
    if (!noteText.trim() || !currentUser?.id) return;
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('notes').upsert({
        user_id: currentUser.id,
        content: noteText.trim(),
        expires_at: expiresAt,
      }, { onConflict: 'user_id' });
      window.dispatchEvent(new Event('lbt:notes-updated'));
      onClose();
      setNoteText('');
    } catch (e) {
      console.error('Note error:', e);
    }
  };

  const handleCancel = () => {
    onClose();
    setNoteText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={handleCancel}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-on-surface/15 rounded-full mx-auto mb-1" />
            <h3 className="text-base font-bold text-on-surface text-center">New Note</h3>
            <p className="text-[11px] text-on-surface-variant text-center -mt-1">Visible to friends for 24h</p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              maxLength={60}
              rows={3}
              placeholder="What's on your mind?"
              className="w-full bg-surface-container/60 border border-outline-variant/20 rounded-2xl p-4 text-sm text-on-surface resize-none outline-none focus:border-primary/40 transition-colors"
              autoFocus
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-on-surface-variant/50 font-medium">{noteText.length}/60</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-full border border-outline-variant/20 text-on-surface-variant font-semibold text-xs hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!noteText.trim()}
                  onClick={handlePost}
                  className="px-5 py-2.5 rounded-full bg-on-surface text-surface-container-lowest font-bold text-xs disabled:opacity-30 hover:opacity-90 transition-all active:scale-95"
                >
                  Post
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
