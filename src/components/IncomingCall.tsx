import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface IncomingCallProps {
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  callId: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({
  callerId,
  callerName,
  callerAvatar,
  callType,
  callId,
  onAccept,
  onReject,
}: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pb-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-sm mx-auto bg-surface dark:bg-surface-container rounded-t-3xl shadow-2xl p-6"
      >
        {/* Drag indicator */}
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4" />

        {/* Caller info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative shrink-0">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-xl font-bold text-on-surface">
                {callerName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-base font-bold text-on-surface truncate">{callerName}</h3>
            <p className="text-xs text-on-surface-variant font-semibold">
              Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            <span className="text-[10px] font-semibold text-on-surface-variant">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95 transition-all animate-pulse"
              title="Accept"
            >
              {callType === 'video' ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <Phone className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-[10px] font-semibold text-on-surface-variant">Accept</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
