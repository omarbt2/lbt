import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionDialogProps {
  type: 'microphone' | 'camera' | 'notifications';
  isOpen: boolean;
  isDenied?: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const MicrophoneIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

const BellIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

const iconMap = {
  microphone: MicrophoneIcon,
  camera: CameraIcon,
  notifications: BellIcon,
};

const titleMap = {
  microphone: 'Microphone Access',
  camera: 'Camera Access',
  notifications: 'Notification Access',
};

const descriptionMap = {
  microphone: 'We need access to your microphone for voice messages and calls.',
  camera: 'We need access to your camera for taking photos and recording stories.',
  notifications: 'Enable notifications to stay updated with likes, comments, and messages.',
};

const deniedInstructions = {
  microphone: 'Go to your browser settings → Site Settings → Microphone, and allow access for this site.',
  camera: 'Go to your browser settings → Site Settings → Camera, and allow access for this site.',
  notifications: 'Go to your browser settings → Site Settings → Notifications, and allow access for this site.',
};

export default function PermissionDialog({ type, isOpen, isDenied = false, onAllow, onDeny }: PermissionDialogProps) {
  const Icon = iconMap[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Icon />
            </div>
            <h3 className="text-sm font-bold text-on-surface text-center">
              {titleMap[type]}
            </h3>
            {isDenied ? (
              <div className="space-y-2">
                <p className="text-xs text-error font-medium text-center">
                  Permission was denied
                </p>
                <p className="text-xs text-on-surface-variant text-center">
                  {deniedInstructions[type]}
                </p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant text-center">
                {descriptionMap[type]}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={onDeny}
                className="px-5 py-2.5 text-xs font-bold text-on-surface-variant border border-outline-variant/40 rounded-full hover:bg-surface-container transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={onAllow}
                className="px-5 py-2.5 text-xs font-bold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
              >
                Allow
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
