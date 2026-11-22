import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { getDefaultAvatar } from '../../lib/defaultAvatars';
import { useAuthStore } from '../../store/authStore';
import { getOrCreateConversation } from '../../lib/api/messages';
import type { User } from '../../types';

interface ShareToDmModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postThumbnail?: string;
  onShareSent?: () => void;
}

export default function ShareToDmModal({ isOpen, onClose, postId, postThumbnail, onShareSent }: ShareToDmModalProps) {
  const { currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<(User & { lastMessage?: string })[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    const fetchFriends = async () => {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      const followingIds = following?.map((f: any) => f.following_id) ?? [];

      if (followingIds.length === 0) { setFriends([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIds)
        .limit(50);

      if (profiles) {
        setFriends(profiles.map((p: any) => ({
          id: p.id,
          name: p.display_name || p.name,
          username: p.username,
          avatar: p.avatar_url,
          bio: p.bio || '',
          posts_count: 0,
          followersCount: 0,
          followingCount: 0,
          isFollowing: true,
        })));
      }
    };
    fetchFriends();
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setSearchQuery('');
      setSelectedFriends(new Set());
      setSent(false);
    }
  }, [isOpen]);

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedFriends.size === 0 || !currentUser?.id) return;
    setIsSending(true);
    try {
      const shareUrl = `${window.location.origin}/post/${postId}`;
      for (const friendId of selectedFriends) {
        const convId = await getOrCreateConversation(friendId);
        await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id: currentUser.id,
          content: `Shared a post: ${shareUrl}`,
          message_type: 'post_share',
          is_read: false,
          is_seen: false,
        });
      }
      setSent(true);
      setTimeout(() => {
        onShareSent?.();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Share to DM failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-lg bg-surface-container-lowest dark:bg-surface-container-low rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <h3 className="text-base font-bold text-on-surface">Share to DM</h3>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container dark:bg-surface-container-high flex items-center justify-center"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </motion.button>
            </div>

            {/* Search */}
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full bg-surface-container dark:bg-surface-container-high rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none text-on-surface placeholder:text-outline"
                />
              </div>
            </div>

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                    <Send className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-sm font-bold text-on-surface">Shared successfully!</p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredFriends.map(friend => {
                    const isSelected = selectedFriends.has(friend.id);
                    return (
                      <motion.button
                        key={friend.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleFriend(friend.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-surface-container dark:hover:bg-surface-container-high border border-transparent'
                        }`}
                      >
                        <Avatar src={friend.avatar} userId={friend.id} name={friend.name} size="md" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{friend.name}</p>
                          <p className="text-xs text-outline truncate">@{friend.username}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-outline-variant/40'
                        }`}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            >
                              <Send className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                  {filteredFriends.length === 0 && (
                    <p className="text-center text-sm text-outline py-8">No friends found</p>
                  )}
                </div>
              )}
            </div>

            {/* Send button */}
            {!sent && selectedFriends.size > 0 && (
              <div className="px-5 pb-6 pt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending...' : `Send to ${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''}`}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
