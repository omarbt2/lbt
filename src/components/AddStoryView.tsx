import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Sun, Moon, Volume2, Link, Timer, Smile, Type, Brush, Award, Video, Image, Users } from 'lucide-react';
import { getPermissionDeniedMessage } from '../lib/permissions';

import { useStorage } from '../hooks/useStorage';
import { createStory } from '../lib/api/stories';

interface AddStoryProps {
  onClose: () => void;
  onStoryAdded: (imageSrc: string) => void;
}

export default function AddStoryView({ onClose, onStoryAdded }: AddStoryProps) {
  const [permDeniedType, setPermDeniedType] = useState<'camera' | 'microphone' | null>(null);
  const showPermissionDenied = (type: 'camera' | 'microphone') => setPermDeniedType(type);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeFilter, setActiveFilter] = useState<'normal' | 'cool' | 'sunset' | 'neon'>('normal');
  const [flash, setFlash] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stickerEmoji, setStickerEmoji] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState<string>('');
  const [isTypingText, setIsTypingText] = useState(false);

  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (!active) { mediaStream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setHasCameraAccess(true);
      } catch (err) {
        console.warn('Camera access denied. Activating fallback simulator.', err);
        setHasCameraAccess(false);
        showPermissionDenied('camera');
      }
    }
    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, []);

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    if (hasCameraAccess && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 1136;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        setMediaType('image');
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(360, 360, 50, 360, 640, 600);
        gradient.addColorStop(0, activeFilter === 'sunset' ? '#f59e0b' : activeFilter === 'neon' ? '#f43f5e' : '#60a5fa');
        gradient.addColorStop(1, activeFilter === 'sunset' ? '#ec4899' : activeFilter === 'neon' ? '#1e1b4b' : '#1e3a8a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 720, 1280);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let i = 0; i < 15; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * 720, Math.random() * 1280, Math.random() * 50 + 20, 0, Math.PI * 2);
          ctx.fill();
        }

        setCapturedImage(canvas.toDataURL('image/jpeg'));
        setMediaType('image');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      setMediaType('video');
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setCapturedImage(null);
    } else if (file.type.startsWith('image/')) {
      setMediaType('image');
      const url = URL.createObjectURL(file);
      setCapturedImage(url);
      setVideoFile(null);
      setVideoPreviewUrl(null);
    }
    e.target.value = '';
  };

  const { uploadFile, uploadBase64 } = useStorage();

  const handlePublish = async () => {
    setIsUploading(true);
    setStoryError(null);
    try {
      let mediaUrl = '';

      if (mediaType === 'video' && videoFile) {
        mediaUrl = await uploadFile('stories', videoFile);
      } else if (capturedImage) {
        if (capturedImage.startsWith('data:')) {
          mediaUrl = await uploadBase64('stories', capturedImage);
        } else {
          mediaUrl = capturedImage;
        }
      } else {
        mediaUrl = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=85';
      }

      await createStory(mediaUrl, {
        mediaType: mediaType,
        caption: caption.trim() || undefined,
        closeFriendsOnly,
      });
      onStoryAdded(mediaUrl);
    } catch (err: any) {
      console.error('Failed to upload story:', err);
      setStoryError(err?.message || 'Failed to publish story. Please try again.');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);
    onClose();
  };

  const stickers = ['🔥', '✨', '☕', '🚀', '🎨', '🎉', '💻', '🎧'];

  const filterThemes = {
    normal: 'contrast-100 brightness-100',
    cool: 'contrast-110 saturate-125 sepia-[20%] hue-rotate-[15deg]',
    sunset: 'contrast-95 brightness-105 saturate-150 sepia-[40%] hue-rotate-[-25deg]',
    neon: 'contrast-125 brightness-95 saturate-175 hue-rotate-[120deg]',
  };

  const hasMedia = capturedImage || videoPreviewUrl;

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col justify-between font-sans select-none h-screen w-screen">
      {flash && <div className="absolute inset-0 bg-white z-50 animate-pulse" />}

      <div className="absolute inset-0 z-0">
        {mediaType === 'video' && videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            loop
            muted
          />
        ) : hasCameraAccess ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${filterThemes[activeFilter]}`}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-tr transition-all duration-700 ease-in-out flex items-center justify-center ${
            activeFilter === 'sunset'
              ? 'from-[#2c2c2e] via-[#3a3a3c] to-[#1c1c1e]'
              : activeFilter === 'neon'
                ? 'from-[#1c1c1e] via-[#2c2c2e] to-[#1c1c1e]'
                : activeFilter === 'cool'
                  ? 'from-[#2c2c2e] via-[#3a3a3c] to-[#1c1c1e]'
                  : 'from-[#1c1c1e] via-[#2c2c2e] to-[#1a2744]'
          }`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="text-center p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 mx-4 max-w-xs z-10">
              <Camera className="w-10 h-10 text-white opacity-40 mx-auto mb-2 animate-pulse" />
              <span className="text-xs font-semibold text-white/50 block">Device camera offline</span>
              <span className="text-xs text-white/80 mt-1 block">Tap a filter or pick media below</span>
            </div>
            <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#3a3a3c] blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#2c2c2e] blur-3xl" />
            </div>
          </div>
        )}

        {stickerEmoji && (
          <div
            onClick={() => setStickerEmoji(null)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl select-none cursor-pointer z-30 transform hover:scale-110 active:scale-95 transition-transform"
          >
            {stickerEmoji}
          </div>
        )}

        {overlayText && (
          <div
            onClick={() => setIsTypingText(true)}
            className="absolute top-1/3 left-0 right-0 text-center text-2xl font-bold text-white px-6 py-2 select-none cursor-pointer bg-black/30 backdrop-blur-sm z-30 shadow-sm"
          >
            {overlayText}
          </div>
        )}
      </div>

      <header className="relative z-10 flex justify-between items-center px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 mt-2">
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              const filters: ('normal'|'cool'|'sunset'|'neon')[] = ['normal', 'cool', 'sunset', 'neon'];
              const currentIdx = filters.indexOf(activeFilter);
              setActiveFilter(filters[(currentIdx + 1) % filters.length]);
            }}
            className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Toggle Filters"
          >
            <Sun className="w-5 h-5 text-on-surface" />
          </button>

          <button
            onClick={() => setOverlayText('LBT Mood ✨')}
            className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Create Text Overlay"
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="absolute right-6 top-1/4 flex flex-col space-y-4 items-center z-10">
        {stickers.map((stk) => (
          <button
            key={stk}
            onClick={() => setStickerEmoji(stk)}
            className="w-10 h-10 text-2xl hover:scale-125 transition-transform"
            title={`Stamp ${stk}`}
          >
            {stk}
          </button>
        ))}
      </div>

      {isTypingText && (
        <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center p-6">
          <input
            type="text"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Type your story caption..."
            className="bg-transparent border-b-2 border-white text-white text-2xl text-center outline-none py-2 w-full max-w-md"
            autoFocus
          />
          <button
            onClick={() => setIsTypingText(false)}
            className="mt-6 bg-primary text-white font-semibold py-2 px-6 rounded-full"
          >
            Apply Text
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] space-y-4">
        {storyError && (
          <div className="w-full max-w-sm bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-xs text-error font-semibold backdrop-blur-md">
            {storyError}
          </div>
        )}

        {hasMedia && (
          <div className="w-full max-w-sm">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors"
              maxLength={150}
            />
          </div>
        )}

        {hasMedia && (
          <button
            onClick={() => setCloseFriendsOnly(!closeFriendsOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              closeFriendsOnly
                ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                : 'bg-white/10 text-white/70 border border-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Close Friends only {closeFriendsOnly ? '🟢' : ''}</span>
          </button>
        )}

        {hasMedia ? (
          <div className="flex space-x-3 w-full max-w-sm justify-center">
            <button
              onClick={handlePublish}
              disabled={isUploading}
              className="flex-1 bg-primary text-white py-3.5 px-6 rounded-2xl font-semibold flex items-center justify-center space-x-2 shadow-[0_10px_30px_rgba(26,39,68,0.3)] hover:bg-[#0f1a2e] transition-all cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Add to Your Story</span>
              )}
            </button>
            <button
              onClick={() => {
                setCapturedImage(null);
                setVideoFile(null);
                setVideoPreviewUrl(null);
                setCaption('');
                setMediaType('image');
              }}
              className="bg-zinc-800 text-white/95 py-3.5 px-5 rounded-2xl font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Retake
            </button>
          </div>
        ) : (
          <div className="bg-black/35 backdrop-blur-xl w-full max-w-md rounded-[32px] p-4 flex items-center justify-between border border-white/10 shadow-lg">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 hover:scale-105 transition-transform"
            >
              <img
                src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=85"
                alt="Gallery"
                className="w-full h-full object-cover"
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              onClick={handleCapture}
              aria-label="Take Photo"
              className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center p-1 cursor-pointer transition-transform duration-100 active:scale-90 hover:scale-105 shadow-xl"
            >
              <div className="w-full h-full rounded-full border-4 border-black/15 bg-white" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              title="Pick video"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {permDeniedType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto">
              {permDeniedType === 'camera' ? (
                <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-error">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 6.93z"/>
                </svg>
              )}
            </div>
            <h3 className="text-sm font-bold text-on-surface text-center">
              {getPermissionDeniedMessage(permDeniedType)}
            </h3>
            <p className="text-xs text-on-surface-variant text-center">
              {permDeniedType === 'camera'
                ? 'Camera access is needed to take photos and record stories.'
                : 'Microphone access is needed to record voice messages and make calls.'}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setPermDeniedType(null)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
