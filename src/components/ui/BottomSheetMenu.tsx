import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDefaultAvatar } from '../../lib/defaultAvatars';

export interface BottomSheetMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface BottomSheetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: BottomSheetMenuItem[];
  header?: {
    avatar?: string;
    name: string;
    subtitle?: string;
  };
}

export default function BottomSheetMenu({ isOpen, onClose, items, header }: BottomSheetMenuProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest rounded-t-3xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
            </div>

            <div className="px-4 pb-6">
              {header && (
                <div className="flex items-center gap-3 px-2 mb-4">
                  {header.avatar && (
                    <img src={header.avatar || getDefaultAvatar(header.name || '')} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-on-surface">{header.name}</p>
                    {header.subtitle && (
                      <p className="text-[10px] text-outline">{header.subtitle}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                {items.map((item, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={item.onClick}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors hover:bg-surface-container/50 ${
                      item.destructive ? 'text-error hover:bg-error/5' : 'text-on-surface'
                    }`}
                  >
                    <span className={`shrink-0 ${item.destructive ? 'text-error' : 'text-on-surface-variant'}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full mt-3 py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
