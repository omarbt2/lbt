import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar } from './ui/Avatar';
import { Zap } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  expires_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotesBarProps {
  currentUser?: { id: string; name: string; avatar: string };
  onOpenNoteModal?: () => void;
}

export default function NotesBar({ currentUser, onOpenNoteModal }: NotesBarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const { data } = await supabase
        .from('notes')
        .select('*, profiles!user_id(username, display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(30);
      setNotes(data || []);
    } catch (e) {
      console.error('fetchNotes error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  useEffect(() => {
    const handleNotesUpdated = () => { void fetchNotes(); };
    window.addEventListener('lbt:notes-updated', handleNotesUpdated);
    return () => window.removeEventListener('lbt:notes-updated', handleNotesUpdated);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchNotes, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-[60px] h-[60px] rounded-full bg-surface-container animate-pulse" />
          <div className="w-10 h-1.5 rounded bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );

  const myNote = currentUser ? notes.find(n => n.user_id === currentUser.id) : null;
  const otherNotes = currentUser ? notes.filter(n => n.user_id !== currentUser.id) : notes;

  return (
    <div className="relative">
      <div className="flex gap-3 px-4 py-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {currentUser && (
          <button
            onClick={() => onOpenNoteModal?.()}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className="relative">
              <Avatar
                src={currentUser.avatar}
                userId={currentUser.id}
                name={currentUser.name}
                size="lg"
                className="w-[60px] h-[60px] border-2 border-primary/50"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-surface-container-lowest shadow-sm z-20">
                <span className="text-white text-[11px] font-bold leading-none">+</span>
              </div>
              {myNote && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30">
                  <div className="bg-primary/10 border border-primary/30 rounded-2xl px-3 py-2 text-[11px] max-w-[110px] text-center shadow-lg font-semibold text-primary">
                    {myNote.content}
                  </div>
                  <div className="flex justify-center -mt-0.5">
                    <div className="w-2 h-2 bg-primary/10 border-r border-b border-primary/30 rotate-45 -mt-1" />
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-on-surface-variant font-medium">
              {myNote ? 'Edit note' : 'Your note'}
            </span>
          </button>
        )}

        {otherNotes.map(note => (
          <button
            type="button"
            key={note.id}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer text-left"
            aria-expanded={expandedNote === note.id}
            aria-label={`Show note from ${note.profiles?.display_name || note.profiles?.username || 'user'}`}
            onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
          >
            <div className="relative">
              <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-primary to-primary/60">
                <Avatar
                  src={note.profiles?.avatar_url || ''}
                  userId={note.user_id}
                  name={note.profiles?.display_name || note.profiles?.username || ''}
                  size="lg"
                  className="w-[56px] h-[56px] border-2 border-white"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm z-20">
                <Zap className="w-2.5 h-2.5 text-white" fill="currentColor" />
              </div>
              {expandedNote === note.id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 pointer-events-none">
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-3 py-2 text-[11px] max-w-[150px] min-w-[110px] text-center shadow-lg font-semibold text-on-surface whitespace-normal break-words">
                    {note.content}
                  </div>
                  <div className="flex justify-center -mt-0.5">
                    <div className="w-2 h-2 bg-surface-container-lowest border-r border-b border-outline-variant/30 rotate-45 -mt-1" />
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-on-surface-variant font-medium truncate max-w-[56px]">
              {note.profiles?.display_name?.split(' ')[0] || note.profiles?.username?.split('_')[0] || 'User'}
            </span>
          </button>
        ))}

        {!currentUser && notes.length === 0 && (
          <p className="text-xs text-on-surface-variant px-2 py-4">No notes yet</p>
        )}
      </div>
    </div>
  );
}
