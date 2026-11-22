import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'error';
}

function Toast({ message, type }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  const iconMap = {
    success: <CheckCircle className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-error" />,
    info: <Info className="w-4 h-4 text-primary" />,
  };

  const borderMap = {
    success: 'border-success/20',
    error: 'border-error/20',
    info: 'border-primary/20',
  };

  const bgMap = {
    success: 'bg-surface-container-lowest dark:bg-surface-container',
    error: 'bg-surface-container-lowest dark:bg-surface-container',
    info: 'bg-surface-container-lowest dark:bg-surface-container',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`fixed top-6 right-4 sm:right-6 z-[9999] border ${borderMap[type]} ${bgMap[type]} rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 text-sm font-semibold max-w-xs backdrop-blur-xl`}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-container dark:bg-surface-container-high shrink-0">
        {iconMap[type]}
      </div>
      <span className="text-on-surface leading-tight">{message}</span>
    </motion.div>
  );
}

export default React.memo(Toast);
