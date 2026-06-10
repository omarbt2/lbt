import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface FollowButtonProps {
  userId: string;
  currentUserId: string;
  initialFollowing?: boolean;
  size?: 'sm' | 'md';
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({ userId, currentUserId, initialFollowing, size = 'md', onFollowChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [loading, setLoading] = useState(initialFollowing === undefined);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (initialFollowing !== undefined || !userId || !currentUserId || userId === currentUserId) {
      setLoading(false);
      return;
    }
    supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', userId).maybeSingle()
      .then(({ data }) => { setFollowing(!!data); setLoading(false); });
  }, [userId, currentUserId, initialFollowing]);

  const handleToggle = async () => {
    if (!currentUserId || userId === currentUserId) return;
    setLoading(true);
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      setFollowing(false);
      onFollowChange?.(false);
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId });
      if (!error) { setFollowing(true); onFollowChange?.(true); }
      else if (error.message.includes('private')) { setRequested(true); }
    }
    setLoading(false);
  };

  if (userId === currentUserId) return null;

  const sizeClass = size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-5 py-1.5 text-xs';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full font-bold transition-all disabled:opacity-60 ${sizeClass} ${
        following ? 'border border-outline-variant/40 text-on-surface bg-surface-container'
        : requested ? 'border border-primary/40 text-primary bg-primary/5'
        : 'bg-primary text-white'
      }`}
    >
      {loading ? '...' : following ? 'Following' : requested ? 'Requested' : 'Follow'}
    </button>
  );
}
