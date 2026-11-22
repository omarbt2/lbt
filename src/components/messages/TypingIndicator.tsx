import React from 'react';
import { motion } from 'motion/react';
import { Avatar } from '../ui/Avatar';

interface TypingIndicatorProps {
  userName: string;
  userAvatar: string;
  userId: string;
}

export default function TypingIndicator({ userName, userAvatar, userId }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex gap-3 max-w-[80%] mr-auto"
    >
      <Avatar src={userAvatar} userId={userId} name={userName} size="xs" className="w-7 h-7 mt-1 shrink-0 shadow-sm" />
      <div className="bg-surface-container-high dark:bg-surface-container-high rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </motion.div>
  );
}
