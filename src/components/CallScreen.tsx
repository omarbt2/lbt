import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Camera, CameraOff } from 'lucide-react';
import { motion } from 'motion/react';
import type { CallState } from '../hooks/useWebRTC';

interface CallScreenProps {
  callState: CallState;
  callType: 'audio' | 'video';
  remoteUser: { id: string; name: string; avatar: string };
  isMuted: boolean;
  isSpeakerOn: boolean;
  duration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera?: () => void;
}

export default function CallScreen({
  callState,
  callType,
  remoteUser,
  isMuted,
  isSpeakerOn,
  duration,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusText =
    callState === 'calling' ? 'Calling...' :
    callState === 'active' ? formatTime(duration) :
    callState === 'ended' ? 'Call ended' :
    'Connecting...';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Background: blurred avatar + dark overlay */}
      <div className="absolute inset-0 z-0">
        {remoteUser.avatar ? (
          <img
            src={remoteUser.avatar}
            alt=""
            className="w-full h-full object-cover blur-3xl scale-110 opacity-30"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#1a2744] to-[#0f1a2e]" />
        )}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Remote video for video calls */}
      {callType === 'video' && (
        <div className="absolute inset-0 z-1">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Top status bar */}
      <div className="relative z-10 w-full p-6 pt-[calc(env(safe-area-inset-top)+16px)] flex justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-full py-2 px-5 flex items-center gap-3 border border-white/20">
          <span className="text-xs font-bold text-white">{statusText}</span>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {callType === 'audio' || callState !== 'active' ? (
          <div className="text-center flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary blur-xl opacity-40"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {remoteUser.avatar ? (
                <img
                  src={remoteUser.avatar}
                  alt={remoteUser.name}
                  className="w-full h-full rounded-full object-cover border-2 border-white/20 shadow-2xl relative z-10"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-700 border-2 border-white/20 relative z-10 flex items-center justify-center text-3xl font-bold text-white">
                  {remoteUser.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{remoteUser.name}</h1>
            <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">
              {callState === 'calling' ? 'Calling...' : callType === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
          </div>
        ) : null}

        {/* Audio waveform for voice calls */}
        {callType === 'audio' && callState === 'active' && (
          <div className="flex items-center gap-1.5 mt-8 h-8 pointer-events-none">
            <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-4'}`} style={{ animationDuration: '0.8s' }} />
            <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-6'}`} style={{ animationDuration: '1.2s' }} />
            <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-8'}`} style={{ animationDuration: '0.9s' }} />
            <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-5'}`} style={{ animationDuration: '1.4s' }} />
            <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-7'}`} style={{ animationDuration: '1.1s' }} />
          </div>
        )}
      </div>

      {/* Local video PIP for video calls */}
      {callType === 'video' && localStream && (
        <div className="absolute bottom-32 right-6 z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-28 h-36 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
          />
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 w-full px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-center">
        <div className="bg-white/10 border border-white/20 backdrop-blur-2xl rounded-full p-2.5 flex items-center gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white/80 hover:text-white'
            }`}
            title="Mute"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEndCall}
            className="w-18 h-18 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_4px_15px_rgba(239,68,68,0.5)] hover:scale-105 transition-all mx-1"
            title="End Call"
            style={{ width: '4.5rem', height: '4.5rem' }}
          >
            <PhoneOff className="w-7 h-7 fill-white" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !isSpeakerOn ? 'bg-white/15 text-white/80' : 'bg-white/25 text-white'
            }`}
            title="Speaker"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </motion.button>

          {callType === 'video' && onToggleCamera && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleCamera}
              className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all"
              title="Toggle Camera"
            >
              <CameraOff className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
