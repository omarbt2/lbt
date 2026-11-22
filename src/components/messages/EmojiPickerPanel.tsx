import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EMOJI_CATEGORIES, QUICK_REACTIONS } from '../../lib/api/emojis';
import type { EmojiItem } from '../../lib/api/emojis';

interface EmojiPickerPanelProps {
  isOpen: boolean;
  allEmojis: EmojiItem[];
  selectedEmojiCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectEmoji: (emoji: EmojiItem) => void;
}

export default function EmojiPickerPanel({
  isOpen,
  allEmojis,
  selectedEmojiCategory,
  onSelectCategory,
  onSelectEmoji,
}: EmojiPickerPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden"
        >
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-b border-outline-variant/20 shrink-0">
            {EMOJI_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                  selectedEmojiCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
            {(allEmojis.length > 0
              ? allEmojis.filter(e => e.category === selectedEmojiCategory)
              : QUICK_REACTIONS.map(e => ({ char: e, name: e, category: '', group: '', htmlCode: [], unicode: [] } as EmojiItem))
            ).map((emoji, i) => (
              <button
                key={`${emoji.name}-${i}`}
                onClick={() => onSelectEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-surface-container rounded-lg transition-colors"
              >
                {emoji.char}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
