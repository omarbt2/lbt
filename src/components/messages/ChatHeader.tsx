import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { formatRelativeTime } from '../../lib/api/posts';
import type { User } from '../../types';

interface ChatHeaderProps {
  user: User;
  otherUserOnline: boolean;
  otherUserLastSeen: string | null;
  otherUserTyping: boolean;
  disappearingEnabled: boolean;
  onBack: () => void;
  onToggleDisappearing: () => void;
}

function ChatHeader({
  user,
  otherUserOnline,
  otherUserLastSeen,
  otherUserTyping,
  disappearingEnabled,
  onBack,
  onToggleDisappearing,
}: ChatHeaderProps) {
  return (
    <header className="flex justify-between items-center px-4 py-3 bg-surface-container-low dark:bg-surface-container-low border-b border-outline-variant/30 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden text-on-surface-variant p-1 hover:bg-surface-container rounded-full transition-colors shrink-0"
          title="Return to chats list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative shrink-0">
           <Avatar src={user.avatar} userId={user.id} name={user.name} size="md" />
           {otherUserOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface-container-low" />}
        </div>
        <div className="min-w-0 text-left">
          <h2 className="text-sm font-bold text-on-surface truncate">{user.name}</h2>
          <p className="text-[10px] font-semibold flex items-center gap-1">
            {otherUserTyping ? (
              <span className="text-primary">Typing...</span>
            ) : otherUserOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Active now
              </>
            ) : otherUserLastSeen ? (
              <span className="text-outline">{formatRelativeTime(otherUserLastSeen)}</span>
            ) : (
              <span className="text-outline">Offline</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleDisappearing}
          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
            disappearingEnabled
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
          }`}
          title="Toggle disappearing messages (24h)"
        >
          ⏱ {disappearingEnabled ? 'ON' : 'OFF'}
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors" aria-label="More options">
          <MoreVertical className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}

export default React.memo(ChatHeader);
