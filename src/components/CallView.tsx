// NOTE: Calls use STUN only. For production, add TURN server credentials.
// See /api/turn-credentials endpoint — currently not implemented.
// Calls will work on same WiFi but may fail over mobile data / different networks.

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Grid, UserPlus, RefreshCw, Sparkles } from 'lucide-react';

interface CallViewProps {
  type: 'voice' | 'video';
  onHangup: () => void;
  callerName?: string;
  callerAvatar?: string;
}

export default function CallView({ type, onHangup, callerName = "Contact", callerAvatar = '' }: CallViewProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [magicFilter, setMagicFilter] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 font-sans flex flex-col justify-between text-white h-screen w-screen overflow-hidden">
      {/* 1. BACKGROUND LAYERS */}
      {type === 'video' ? (
        <div className="absolute inset-0 z-0">
          {/* Main Remote Camera Frame */}
          {!isCameraOff ? (
            <img
              src={callerAvatar}
              alt="Caller Video"
              className={`w-full h-full object-cover transition-all duration-300 ${magicFilter ? 'hue-rotate-30 saturate-150 contract-110 filter' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <VideoOff className="w-12 h-12 text-white/30 mx-auto mb-2" />
                <span className="text-xs text-white/50 block">Elena paused camera</span>
              </div>
            </div>
          )}
          {/* Dark gradient mapping overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
        </div>
      ) : (
        /* Voice call backdrop with glowing radial halos */
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1a2744] to-[#0f1a2e] flex items-center justify-center">
          <div className="absolute w-72 h-72 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute w-96 h-96 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute w-[32rem] h-[32rem] rounded-full bg-primary/5 animate-pulse" />
        </div>
      )}

      {/* 2. TOP OVERLAY HEADER BAR */}
      <div className="relative z-10 w-full p-6 pt-[calc(env(safe-area-inset-top)+16px)] flex justify-between items-start pointer-events-none">
        {/* Connection status badge (Glassmorphic) */}
        <div className="glass-panel text-on-surface rounded-full py-1.5 px-4 flex items-center gap-3 pointer-events-auto shadow-lg border border-white/20">
          <div className="relative">
            <img
              src={callerAvatar}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-white/40"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-on-surface rounded-full border border-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800">{callerName}</span>
            <span className="text-[10px] font-semibold text-slate-500">Connected • HD</span>
          </div>
        </div>

        {/* Action icons right */}
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all ${
              isSpeakerOn ? 'bg-white/20' : 'bg-black/30'
            }`}
          >
            <Volume2 className="w-5 h-5 text-white" />
          </button>
          <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center hover:bg-white/20 transition-colors">
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 flex-grow">
        {type === 'voice' && (
          <div className="text-center flex flex-col items-center">
            {/* Soft avatar box */}
            <div className="relative w-28 h-28 mb-4">
              <div className="absolute inset-0 rounded-full bg-primary blur-xl opacity-40 animate-pulse" />
              <img
                src={callerAvatar}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border-2 border-white/20 shadow-2xl relative z-10"
              />
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight mb-1">{callerName}</h1>
            <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Voice Calling</p>
          </div>
        )}

        {/* Dynamic call duration label */}
        <span className="mt-4 text-sm font-bold bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-white/95">
          {formatTime(seconds)}
        </span>

        {/* Interactive sound wave vector bars */}
        <div className="flex items-center gap-1.5 mt-8 h-8 pointer-events-none">
          <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-4'}`} style={{ animationDuration: '0.8s' }} />
          <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-6'}`} style={{ animationDuration: '1.2s' }} />
          <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-8'}`} style={{ animationDuration: '0.9s' }} />
          <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-5'}`} style={{ animationDuration: '1.4s' }} />
          <div className={`w-1 bg-primary rounded-full transition-transform ${isMuted ? 'h-1' : 'animate-wave h-7'}`} style={{ animationDuration: '1.1s' }} />
        </div>
      </div>

      {/* 4. LOCAL SELF PREVIEW (Float-over, only in Video calls) */}
      {type === 'video' && (
        <div className="absolute right-6 bottom-24 z-20">
          <div className="w-24 h-36 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl relative group hover:scale-105 transition-transform cursor-pointer">
            <img
              src={callerAvatar}
              alt="My camera preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
            </div>
          </div>
        </div>
      )}

      {/* 5. BOTTOM COMMAND BUTTONS ROW (Glassmorphic) */}
      <div className="relative z-10 w-full px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-center">
        <div className="bg-white/10 border border-white/20 backdrop-blur-2xl rounded-full p-2.5 flex items-center gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-error text-white' : 'hover:bg-white/15 text-white/80 hover:text-white'
            }`}
            title="Mute call"
          >
            {isMuted ? <MicOff className="w-5.5 h-5.5" /> : <Mic className="w-5.5 h-5.5" />}
          </button>

          {/* Toggle Camera (Only available/visible in video calls) */}
          {type === 'video' && (
            <>
              <button
                onClick={() => setIsCameraOff(!isCameraOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isCameraOff ? 'bg-zinc-800 text-white' : 'hover:bg-white/15 text-white/80 hover:text-white'
                }`}
                title="Pause Video"
              >
                {isCameraOff ? <VideoOff className="w-5.5 h-5.5" /> : <Video className="w-5.5 h-5.5" />}
              </button>

              <button
                onClick={() => setMagicFilter(!magicFilter)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  magicFilter ? 'bg-primary text-white shadow-[0_0_12px_rgba(26,39,68,0.5)]' : 'hover:bg-white/15 text-white/80 hover:text-white'
                }`}
                title="AI Magic Filters"
              >
                <Sparkles className="w-5.5 h-5.5 text-on-surface fill-on-surface" />
              </button>
            </>
          )}

          {/* HANGUP RED BUTTON */}
          <button
            onClick={onHangup}
            className="w-14 h-14 rounded-full bg-error hover:bg-error text-white flex items-center justify-center shadow-[0_4px_15px_rgba(255,59,48,0.5)] hover:scale-105 active:scale-95 transition-all ml-2"
            title="Hang up call"
          >
            <PhoneOff className="w-6 h-6 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
