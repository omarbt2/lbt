import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { formatRelativeTime } from '../../lib/api/posts';
import type { User } from '../../types';

interface ChatHeaderProps {
  user: User;
  otherUserOnline: boolean;
  otherUserLastSeen: string | null;
  otherUserTyping: boolean;
  onBack: () => void;
}

function ChatHeader({ user, otherUserOnline, otherUserLastSeen, otherUserTyping, onBack }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-surface-container-low border-b border-outline-variant/25 shrink-0">
      <button
        onClick={onBack}
        className="md:hidden text-on-surface-variant p-1.5 -ml-1 rounded-full hover:bg-surface-container transition-colors shrink-0"
        title="Return to chats list"
        aria-label="Back to chats"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="relative shrink-0">
        <Avatar src={user.avatar} userId={user.id} name={user.name} size="md" />
        {otherUserOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface-container-low" />}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h2 className="text-sm font-semibold text-on-surface truncate">{user.name}</h2>
        <p className="text-[10px] font-medium flex items-center gap-1.5 mt-0.5">
          {otherUserTyping ? (
            <span className="text-primary">Typing…</span>
          ) : otherUserOnline ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /><span className="text-on-surface-variant">Active now</span></>
          ) : otherUserLastSeen ? (
            <span className="text-outline">Last seen {formatRelativeTime(otherUserLastSeen)}</span>
          ) : (
            <span className="text-outline">Offline</span>
          )}
        </p>
      </div>
    </header>
  );
}

export default React.memo(ChatHeader);
