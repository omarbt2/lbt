import React, { useState, useEffect } from 'react';
import {
  Lock, EyeOff, Check, UserX, UserMinus, ChevronRight, X
} from 'lucide-react';
import { Toggle } from './SettingsHelpers';
import { Avatar } from '../ui/Avatar';
import { getBlockedUsers, getMutedUsers, unblockUser, unmuteUser } from '../../lib/api/blocks';

interface PrivacySettingsProps {
  privateAccount: boolean;
  setPrivateAccount: (v: boolean) => void;
  hideActivity: boolean;
  setHideActivity: (v: boolean) => void;
  allowMentions: string;
  setAllowMentions: (v: string) => void;
  blockedCount: number;
  mutedCount: number;
  updateProfileField: (field: string, value: any) => Promise<void>;
}

function UserListSheet({
  title, isOpen, onClose, items, onRemove, emptyLabel,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onRemove: (id: string) => Promise<void>;
  emptyLabel: string;
}) {
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => setLocalItems(items), [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[70vh] bg-surface-container-low rounded-t-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
          <h3 className="text-sm font-bold text-on-surface">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-outline" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {localItems.length === 0 ? (
            <p className="text-xs text-outline text-center py-8">{emptyLabel}</p>
          ) : (
            localItems.map((item) => {
              const profile = item.profiles;
              return (
                <div key={item.id} className="flex items-center justify-between p-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={profile?.avatar_url || ''}
                      userId={profile?.id || ''}
                      name={profile?.display_name || profile?.username || ''}
                      className="w-9 h-9"
                    />
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {profile?.display_name || profile?.username || 'User'}
                      </span>
                      <span className="text-[10px] text-outline">@{profile?.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const targetId = item.blocked_id || item.muted_id;
                      await onRemove(targetId);
                      setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
                    }}
                    className="text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10 active:scale-95 transition-transform"
                  >
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrivacySettings({
  privateAccount, setPrivateAccount, hideActivity, setHideActivity,
  allowMentions, setAllowMentions, blockedCount, mutedCount, updateProfileField,
}: PrivacySettingsProps) {
  const [activeSheet, setActiveSheet] = useState<'blocked' | 'muted' | null>(null);
  const [blockedList, setBlockedList] = useState<any[]>([]);
  const [mutedList, setMutedList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isSavingPrivate, setIsSavingPrivate] = useState(false);

  const togglePrivateAccount = async () => {
    if (isSavingPrivate) return;
    const previous = privateAccount;
    const next = !previous;
    setPrivateAccount(next);
    setIsSavingPrivate(true);
    try {
      await updateProfileField('is_private', next);
    } catch (error) {
      setPrivateAccount(previous);
      console.error('Private account update failed:', error);
    } finally {
      setIsSavingPrivate(false);
    }
  };
  const toggleActivityStatus = async () => {
    const next = !hideActivity;
    setHideActivity(next);
    try { await updateProfileField('hide_activity', next); } catch { setHideActivity(!next); }
  };
  const changeMentionAudience = async (next: string) => {
    const previous = allowMentions;
    setAllowMentions(next);
    try { await updateProfileField('allow_mentions', next); } catch { setAllowMentions(previous); }
  };
  const openBlocked = async () => {
    setActiveSheet('blocked');
    setLoadingList(true);
    try {
      const data = await getBlockedUsers();
      setBlockedList(data);
    } finally {
      setLoadingList(false);
    }
  };

  const openMuted = async () => {
    setActiveSheet('muted');
    setLoadingList(true);
    try {
      const data = await getMutedUsers();
      setMutedList(data);
    } finally {
      setLoadingList(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div onClick={() => { if (!isSavingPrivate) void togglePrivateAccount(); }}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all"
          aria-label="Private account setting">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Private Account</span>
              <span className="text-[10px] text-outline">{privateAccount ? 'Only approved followers can see your posts and reels' : 'Your posts and reels are visible according to each post’s audience'}</span>
            </div>
          </div>
          <Toggle enabled={privateAccount} onToggle={togglePrivateAccount} disabled={isSavingPrivate} label="Private account" />
        </div>
        <div onClick={toggleActivityStatus}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <EyeOff className="w-4 h-4 text-on-surface-variant" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Hide Activity Status</span>
              <span className="text-[10px] text-outline">Others won't see when you're online</span>
            </div>
          </div>
          <Toggle enabled={hideActivity} onToggle={toggleActivityStatus} label="Hide activity status" />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="text-xs font-bold text-on-surface">Who Can Mention You</h3>
        </div>
        {['everyone', 'followers', 'nobody'].map((opt) => (
          <div key={opt} onClick={() => void changeMentionAudience(opt)}
            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all ${opt !== 'nobody' ? 'border-t border-outline-variant/10' : ''}`}>
            <span className="text-xs font-bold text-on-surface capitalize">{opt}</span>
            {allowMentions === opt && <Check className="w-4 h-4 text-primary" />}
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div onClick={openBlocked} className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
          <div className="flex items-center gap-3">
            <UserX className="w-4 h-4 text-error" />
            <span className="text-xs font-bold text-on-surface">Blocked Accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-outline">{blockedCount}</span>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
        <div onClick={openMuted} className="flex items-center justify-between p-4 border-t border-outline-variant/10 cursor-pointer hover:bg-surface-container/30 transition-all">
          <div className="flex items-center gap-3">
            <UserMinus className="w-4 h-4 text-on-surface-variant" />
            <span className="text-xs font-bold text-on-surface">Muted Accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-outline">{mutedCount}</span>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </div>

      <UserListSheet
        title="Blocked Accounts"
        isOpen={activeSheet === 'blocked'}
        onClose={() => setActiveSheet(null)}
        items={loadingList ? [] : blockedList}
        onRemove={unblockUser}
        emptyLabel="No blocked accounts"
      />

      <UserListSheet
        title="Muted Accounts"
        isOpen={activeSheet === 'muted'}
        onClose={() => setActiveSheet(null)}
        items={loadingList ? [] : mutedList}
        onRemove={unmuteUser}
        emptyLabel="No muted accounts"
      />
    </div>
  );
}
