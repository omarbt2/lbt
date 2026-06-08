import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, UserPlus, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { getFollowers } from '../lib/api/follows';
import { User } from '../types';
import { Avatar } from './ui/Avatar';

export default function CloseFriendsManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const [followers, setFollowers] = useState<User[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [followersList, cfRows] = await Promise.all([
        getFollowers(currentUser.id),
        (supabase as any).from('close_friends').select('friend_id').eq('user_id', currentUser.id),
      ]);
      setFollowers(followersList);
      if (cfRows.data) {
        setCloseFriendIds(new Set(cfRows.data.map((r: any) => r.friend_id)));
      }
    } catch (err) {
      console.error('Failed to load close friends data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (friendId: string) => {
    if (!currentUser) return;
    const isCurrentlyCF = closeFriendIds.has(friendId);
    setCloseFriendIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyCF) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
    try {
      if (isCurrentlyCF) {
        await (supabase as any).from('close_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendId);
      } else {
        await (supabase as any).from('close_friends')
          .insert({ user_id: currentUser.id, friend_id: friendId });
      }
    } catch (err) {
      console.error('Failed to toggle close friend:', err);
      setCloseFriendIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyCF) next.add(friendId);
        else next.delete(friendId);
        return next;
      });
    }
  };

  const filtered = followers.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 animate-fadeIn py-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface-container rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-on-surface">Close Friends</h1>
          <p className="text-[10px] text-outline font-medium">Stories marked for close friends only will only be visible to people on this list.</p>
        </div>
      </div>

      <div className="relative px-1">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search followers..."
          className="w-full bg-surface-container border border-outline-variant/30 rounded-full py-2.5 pl-10 pr-4 text-xs outline-none focus:border-primary text-on-surface placeholder:text-outline-variant"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-on-surface-variant">
            {followers.length === 0 ? 'No followers yet.' : 'No followers match your search.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-1">
          {filtered.map((person) => {
            const isCF = closeFriendIds.has(person.id);
            return (
              <div
                key={person.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container/50 transition-colors"
              >
                <div className={`p-[2px] rounded-full ${isCF ? 'ring-2 ring-green-500' : ''}`}>
                  <Avatar
                    src={person.avatar}
                    userId={person.id}
                    name={person.name}
                    size="md"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{person.name}</p>
                  <p className="text-[10px] text-outline truncate">@{person.username}</p>
                </div>
                <button
                  onClick={() => handleToggle(person.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                    isCF
                      ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                      : 'bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:border-primary/50'
                  }`}
                >
                  {isCF ? (
                    <>
                      <UserMinus className="w-3.5 h-3.5" /> Remove
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
