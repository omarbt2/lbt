import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '🔥'];

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  currentReaction?: string | null;
}

export default function ReactionPicker({ isOpen, onSelect, onClose, currentReaction }: ReactionPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 bg-surface-container border border-outline-variant/20 rounded-full px-3 py-2 shadow-2xl"
          >
            {REACTIONS.map((emoji, i) => (
              <motion.button
                key={emoji}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 500, damping: 25 }}
                whileHover={{ scale: 1.4 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(emoji)}
                className={`text-2xl leading-none transition-transform ${currentReaction === emoji ? 'scale-125' : ''}`}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
