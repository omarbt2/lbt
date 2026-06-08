import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Avatar } from './ui/Avatar';
import { getDefaultAvatar } from '../lib/defaultAvatars';

interface Note {
  id: string;
  user_id: string;
  content: string;
  expires_at: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface NotesBarProps {
  currentUser: User;
}

export default function NotesBar({ currentUser }: NotesBarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const db = supabase as any;

  const fetchNotes = async () => {
    try {
      const { data, error } = await db
        .from('notes')
        .select('*, profiles(username, display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .limit(20);

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      setNotes(data || []);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 60000);
    return () => clearInterval(interval);
  }, []);

  const ownNote = notes.find((n) => n.user_id === currentUser.id);
  const otherNotes = notes.filter((n) => n.user_id !== currentUser.id);

  const handleOpenModal = () => {
    setInputValue(ownNote?.content || '');
    setShowInputModal(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length > 60 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      if (ownNote) {
        const { error } = await db
          .from('notes')
          .update({ content: trimmed, expires_at: expiresAt })
          .eq('id', ownNote.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from('notes')
          .insert({
            user_id: currentUser.id,
            content: trimmed,
            expires_at: expiresAt,
          });
        if (error) throw error;
      }

      setShowInputModal(false);
      await fetchNotes();
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <section className="py-2">
        <div className="flex items-center gap-3 px-1 mb-3">
          <div className="h-[2px] w-5 rounded-full bg-primary/60" />
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider">Notes</h3>
          <div className="flex-1 h-[2px] rounded-full bg-outline-variant/20" />
        </div>

        <div
          ref={scrollRef}
          className="flex space-x-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Own note */}
          <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group" onClick={handleOpenModal}>
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-primary p-[2px] bg-primary/5 group-hover:scale-105 transition-transform">
                <Avatar
                  src={currentUser.avatar}
                  userId={currentUser.id}
                  name={currentUser.name}
                  size="lg"
                  className="w-full h-full"
                />
              </div>
              {ownNote ? (
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white shadow-md">
                  <Pencil className="w-2.5 h-2.5" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white shadow-md">
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>
            {ownNote ? (
              <div className="relative max-w-[72px]">
                <div className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-1 rounded-xl text-center leading-tight truncate">
                  {ownNote.content}
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary/10 rotate-45" />
              </div>
            ) : (
              <span className="text-[10px] font-bold text-outline">Your Note</span>
            )}
          </div>

          {/* Other notes */}
          {otherNotes.map((note) => (
            <div key={note.id} className="shrink-0 flex flex-col items-center gap-1.5 group">
              <div className="w-14 h-14 rounded-full border-2 border-outline-variant/40 p-[2px] group-hover:scale-105 transition-transform">
                <img
                  src={note.profiles?.avatar_url || getDefaultAvatar(note.user_id)}
                  alt={note.profiles?.display_name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="relative max-w-[72px]">
                <div className="bg-surface-container-high text-on-surface text-[9px] font-bold px-2 py-1 rounded-xl text-center leading-tight truncate">
                  {note.content}
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-container-high rotate-45" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Input modal */}
      <AnimatePresence>
        {showInputModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInputModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-on-surface">
                  {ownNote ? 'Edit Note' : 'Add Note'}
                </h3>
                <button
                  onClick={() => setShowInputModal(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
                  aria-label="Close note editor"
                >
                  <X className="w-4 h-4 text-outline" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={currentUser.avatar}
                  userId={currentUser.id}
                  name={currentUser.name}
                  size="md"
                />
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.slice(0, 60))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="Share a note..."
                    maxLength={60}
                    className="w-full bg-surface-container rounded-xl px-3 py-2 text-xs text-on-surface outline-none border border-outline-variant/30 focus:border-primary placeholder:text-outline-variant"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">
                    {inputValue.length}/60
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-outline mb-4">Your note expires in 24 hours.</p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowInputModal(false)}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!inputValue.trim() || inputValue.trim().length > 60 || isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {ownNote ? 'Update' : 'Share'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
