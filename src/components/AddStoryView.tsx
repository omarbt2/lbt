import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Sun, Type, Users, FlipHorizontal, Palette, Zap } from 'lucide-react';
import { getPermissionDeniedMessage } from '../lib/permissions';
import { useStorage } from '../hooks/useStorage';
import { createStory } from '../lib/api/stories';
import { STORY_TEMPLATES, StoryTemplate } from '../data/storyTemplates';
import { Capacitor } from '@capacitor/core';

function DraggableCaption({
  text,
  onTextChange,
  containerRef,
}: {
  text: string;
  onTextChange: (text: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState({ x: 50, y: 75 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 50, py: 75 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / container.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / container.height) * 100;
    setPos({
      x: Math.max(5, Math.min(95, dragStart.current.px + dx)),
      y: Math.max(5, Math.min(95, dragStart.current.py + dy)),
    });
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <div
        style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', cursor: 'move', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <input
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="Add a caption..."
          className="bg-black/50 text-white text-center rounded-full px-4 py-1.5 text-sm outline-none backdrop-blur-md border border-white/20"
        />
      </div>
    </div>
  );
}

interface AddStoryProps {
  onClose: () => void;
  onStoryAdded: (imageSrc: string) => void;
}

export default function AddStoryView({ onClose, onStoryAdded }: AddStoryProps) {
  const [permDeniedType, setPermDeniedType] = useState<'camera' | 'microphone' | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
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
  const [overlayText, setOverlayText] = useState('');
  const [isTypingText, setIsTypingText] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterThemes: Record<string, string> = {
    normal: 'contrast-100 brightness-100',
    cool: 'contrast-110 saturate-125 hue-rotate-[15deg]',
    sunset: 'contrast-95 brightness-105 saturate-150 sepia-[40%] hue-rotate-[-25deg]',
    neon: 'contrast-125 brightness-95 saturate-175 hue-rotate-[120deg]',
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.requestPermissions({ permissions: ['camera'] });
      return status.camera === 'granted';
    } catch {
      return true;
    }
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      setHasCameraAccess(false);
      setPermDeniedType('camera');
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasCameraAccess(true);
    } catch (err) {
      console.warn('Camera access denied:', err);
      setHasCameraAccess(false);
      setPermDeniedType('camera');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    if (hasCameraAccess && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 1136;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
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
      setVideoPreviewUrl(URL.createObjectURL(file));
      setCapturedImage(null);
    } else if (file.type.startsWith('image/')) {
      setMediaType('image');
      setCapturedImage(URL.createObjectURL(file));
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
      }
      await createStory(mediaUrl, { mediaType, caption: caption.trim() || undefined } as any);
      onStoryAdded(mediaUrl);
      onClose();
    } catch (err: any) {
      setStoryError(err?.message || 'Failed to publish story.');
    }
    setIsUploading(false);
  };

  const hasMedia = capturedImage || videoPreviewUrl;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen w-screen select-none">
      {flash && <div className="absolute inset-0 bg-white z-[99] pointer-events-none transition-opacity" />}

      {/* Camera / preview background */}
      <div className="absolute inset-0 z-0">
        {selectedTemplate && (
          <div className="absolute inset-0 z-0" style={{ background: selectedTemplate.gradient }} />
        )}
        {mediaType === 'video' && videoPreviewUrl ? (
          <video src={videoPreviewUrl} className="w-full h-full object-cover" autoPlay playsInline loop muted />
        ) : hasCameraAccess ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            className={`w-full h-full object-cover ${filterThemes[activeFilter]}`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm font-medium">Camera unavailable</p>
              <p className="text-white/25 text-xs mt-1.5">Select a photo from gallery instead</p>
            </div>
          </div>
        )}
        {capturedImage && (
          <img src={capturedImage} alt="captured" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {capturedImage && caption && (
          <DraggableCaption text={caption} onTextChange={setCaption} containerRef={containerRef} />
        )}
        {overlayText && (
          <div onClick={() => setIsTypingText(true)} className="absolute top-1/3 left-0 right-0 text-center text-2xl font-bold text-white px-6 py-2 bg-black/30 backdrop-blur-sm z-10 cursor-pointer">
            {overlayText}
          </div>
        )}
      </div>

      {/* Top bar — Snapchat style: clean, minimal */}
      <div className="relative z-10 flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 active:scale-90 transition-transform">
          <X className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 active:scale-90 transition-transform"
          >
            <Palette className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => {
              const filters = ['normal', 'cool', 'sunset', 'neon'] as const;
              const next = filters[(filters.indexOf(activeFilter) + 1) % filters.length];
              setActiveFilter(next);
            }}
            className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 active:scale-90 transition-transform"
          >
            <Sun className="w-[18px] h-[18px]" />
          </button>
          <button onClick={() => setIsTypingText(true)} className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 active:scale-90 transition-transform">
            <Type className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Text input overlay */}
      {isTypingText && (
        <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center p-6">
          <input
            type="text"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Type something..."
            className="bg-transparent border-b-2 border-white text-white text-2xl text-center outline-none py-2 w-full max-w-md"
            autoFocus
          />
          <button onClick={() => setIsTypingText(false)} className="mt-6 bg-white text-black font-bold text-sm py-2.5 px-8 rounded-full active:scale-95 transition-transform">
            Done
          </button>
        </div>
      )}

      {/* Bottom controls — Snapchat style */}
      <div className="relative z-10 pb-[calc(env(safe-area-inset-bottom)+16px)] px-5">
        {storyError && (
          <div className="w-full max-w-sm mx-auto mb-3 bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3 text-xs text-red-400 font-semibold text-center">
            {storyError}
          </div>
        )}

        {hasMedia && (
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none"
              maxLength={150}
            />
            <button
              onClick={() => setCloseFriendsOnly(v => !v)}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                closeFriendsOnly ? 'bg-green-500 text-white' : 'bg-white/10 text-white/60 border border-white/15'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main camera row */}
        <div className="flex items-center justify-between w-full max-w-xs mx-auto">
          {/* Gallery */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {/* Capture / Publish — Snapchat-style large ring */}
          {hasMedia ? (
            <button
              onClick={handlePublish}
              disabled={isUploading}
              className="w-[76px] h-[76px] rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30 active:scale-90 transition-transform disabled:opacity-60"
            >
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <Zap className="w-5 h-5 text-white fill-white" />
                  <span className="text-[10px] font-bold text-white leading-none">Send</span>
                </div>
              )}
            </button>
          ) : (
            <button onClick={handleCapture} className="relative w-[76px] h-[76px] rounded-full active:scale-90 transition-transform">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-[5px] border-white/90" />
              {/* Inner fill */}
              <div className="absolute inset-[6px] rounded-full bg-white" />
            </button>
          )}

          {/* Flip / Clear */}
          <button
            onClick={hasMedia ? () => { setCapturedImage(null); setVideoFile(null); setVideoPreviewUrl(null); setCaption(''); } : handleFlipCamera}
            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 active:scale-90 transition-transform"
          >
            {hasMedia ? <X className="w-5 h-5" /> : <FlipHorizontal className="w-5 h-5" />}
          </button>
        </div>

        {!hasMedia && (
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1.5 text-white/40 text-[11px] font-medium mt-3 mx-auto">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload
          </button>
        )}
      </div>

      {/* Template picker */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)}>
          <div className="w-full bg-zinc-900 rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Story Templates</h3>
              <button onClick={() => setShowTemplatePicker(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {STORY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplate(selectedTemplate?.id === tpl.id ? null : tpl);
                    setShowTemplatePicker(false);
                  }}
                  className={`aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedTemplate?.id === tpl.id ? 'border-white scale-95' : 'border-white/10'
                  }`}
                  style={{ background: tpl.gradient }}
                >
                  <span className="text-2xl">{tpl.emoji}</span>
                  <span className="text-[9px] font-bold text-white drop-shadow-md">{tpl.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setSelectedTemplate(null); setShowTemplatePicker(false); }}
              className="w-full py-3 text-xs font-bold text-white/50 hover:text-white border border-white/10 rounded-2xl"
            >
              Clear Template
            </button>
          </div>
        </div>
      )}

      {/* Permission denied modal */}
      {permDeniedType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white text-center">{getPermissionDeniedMessage(permDeniedType)}</h3>
            <p className="text-xs text-white/50 text-center">
              {permDeniedType === 'camera' ? 'Camera access is needed to take photos.' : 'Microphone access is needed for recordings.'}
            </p>
            <button onClick={() => setPermDeniedType(null)} className="w-full py-3 text-xs font-bold text-white bg-primary rounded-full active:scale-95 transition-transform">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
