import React from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, MoreVertical } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Chat, User } from '../../types';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  index: number;
  currentUserId: string;
  onSelect: (id: string) => void;
  onContextMenu: (chatId: string, user: User) => void;
}

function ChatListItem({
  chat,
  isSelected,
  index,
  currentUserId,
  onSelect,
  onContextMenu,
}: ChatListItemProps) {
  const hasUnread = (chat.unreadCount > 0) || ((chat as any).unread_count > 0);
  const lastMsg = chat.messages[chat.messages.length - 1];

  return (
    <motion.div
      key={chat.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      onClick={() => onSelect(chat.id)}
      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
        isSelected ? 'bg-surface-container-high shadow-sm border border-outline-variant/30' : 'hover:bg-surface-container/50'
      }`}
    >
      <div className="relative w-12 h-12 shrink-0">
        <Avatar src={chat.user.avatar} userId={chat.user.id} name={chat.user.name} size="lg" className="w-14 h-14 border border-white/40 shadow-sm" />
        {(chat.user as any).is_online ? (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-surface-container-lowest" />
        ) : (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-on-surface-variant rounded-full border-2 border-surface-container-lowest" />
        )}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-white px-0.5">
            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`text-sm tracking-tight truncate ${isSelected ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>
            {chat.user.name}
          </h3>
          <span className="text-[10px] text-outline font-medium shrink-0">
            {lastMsg?.timeLabel || ''}
          </span>
        </div>
        {(chat.user as any).status_emoji && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px]">{(chat.user as any).status_emoji}</span>
            {(chat.user as any).status_text && (
              <span className="text-[9px] text-on-surface-variant font-medium truncate">{(chat.user as any).status_text}</span>
            )}
          </div>
        )}
        <p className={`text-xs truncate ${hasUnread ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
          {lastMsg?.senderId === currentUserId && (
            lastMsg?.is_seen ? (
              <CheckCheck className="w-3 h-3 text-primary inline mr-1" />
            ) : lastMsg?.isRead ? (
              <CheckCheck className="w-3 h-3 text-outline inline mr-1" />
            ) : (
              <Check className="w-3 h-3 text-outline inline mr-1" />
            )
          )}
          {lastMsg?.message_type === 'voice'
            ? '🎤 Voice message'
            : lastMsg?.text
              ? (lastMsg.text.length > 35 ? lastMsg.text.slice(0, 35) + '...' : lastMsg.text)
              : lastMsg?.imageUrl ? '📷 Shared photo' : 'Send a clean design spark'
          }
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(chat.id, chat.user);
        }}
        className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
        aria-label="Chat options"
      >
        <MoreVertical className="w-4 h-4 text-outline" />
      </button>
    </motion.div>
  );
}

export default React.memo(ChatListItem);
