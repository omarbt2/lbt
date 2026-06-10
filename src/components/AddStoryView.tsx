import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Sun, Type, Video, Users, FlipHorizontal, Palette } from 'lucide-react';
import { getPermissionDeniedMessage } from '../lib/permissions';
import { useStorage } from '../hooks/useStorage';
import { createStory } from '../lib/api/stories';
import { STORY_TEMPLATES, StoryTemplate } from '../data/storyTemplates';

interface AddStoryProps {
  onClose: () => void;
  onStoryAdded: (imageSrc: string) => void;
}

export default function AddStoryView({ onClose, onStoryAdded }: AddStoryProps) {
  const [permDeniedType, setPermDeniedType] = useState<'camera' | 'microphone' | null>(null);
  // Default to back camera ('environment') on mobile
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

  const filterThemes: Record<string, string> = {
    normal: 'contrast-100 brightness-100',
    cool: 'contrast-110 saturate-125 hue-rotate-[15deg]',
    sunset: 'contrast-95 brightness-105 saturate-150 sepia-[40%] hue-rotate-[-25deg]',
    neon: 'contrast-125 brightness-95 saturate-175 hue-rotate-[120deg]',
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
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
        // Mirror front camera only
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
      {flash && <div className="absolute inset-0 bg-white z-[99] pointer-events-none" />}

      {/* Camera / preview background — full screen */}
      <div className="absolute inset-0 z-0">
        {selectedTemplate && (
          <div
            className="absolute inset-0 z-0"
            style={{ background: selectedTemplate.gradient }}
          />
        )}
        {mediaType === 'video' && videoPreviewUrl ? (
          <video src={videoPreviewUrl} className="w-full h-full object-cover" autoPlay playsInline loop muted />
        ) : hasCameraAccess ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${filterThemes[activeFilter]}`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Camera unavailable</p>
              <p className="text-white/30 text-xs mt-1">Select a photo from gallery</p>
            </div>
          </div>
        )}
        {/* Captured image preview */}
        {capturedImage && (
          <img src={capturedImage} alt="captured" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Text overlay */}
        {overlayText && (
          <div onClick={() => setIsTypingText(true)} className="absolute top-1/3 left-0 right-0 text-center text-2xl font-bold text-white px-6 py-2 bg-black/30 backdrop-blur-sm z-10 cursor-pointer">
            {overlayText}
          </div>
        )}
      </div>

      {/* Top controls */}
      <div className="relative z-10 flex justify-between items-center px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-3">
        <button onClick={onClose} className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
            title="Story Templates"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const filters = ['normal', 'cool', 'sunset', 'neon'] as const;
              const next = filters[(filters.indexOf(activeFilter) + 1) % filters.length];
              setActiveFilter(next);
            }}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
          >
            <Sun className="w-5 h-5" />
          </button>
          <button onClick={() => setIsTypingText(true)} className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white">
            <Type className="w-5 h-5" />
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
            placeholder="Type your caption..."
            className="bg-transparent border-b-2 border-white text-white text-2xl text-center outline-none py-2 w-full max-w-md"
            autoFocus
          />
          <button onClick={() => setIsTypingText(false)} className="mt-6 bg-primary text-white font-semibold py-2.5 px-8 rounded-full">
            Done
          </button>
        </div>
      )}

      {/* Bottom controls — all in a row, mobile-first */}
      <div className="relative z-10 flex flex-col items-center px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] gap-3">
        {storyError && (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-semibold">
            {storyError}
          </div>
        )}

        {hasMedia && (
          <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40" maxLength={150} />
        )}

        {hasMedia && (
          <button onClick={() => setCloseFriendsOnly(v => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${closeFriendsOnly ? 'bg-green-500 text-white' : 'bg-white/10 text-white/70 border border-white/20'}`}>
            <Users className="w-4 h-4" />
            Close Friends {closeFriendsOnly ? '✓' : ''}
          </button>
        )}

        {/* Main camera row */}
        <div className="flex items-center justify-between w-full max-w-sm">
          {/* Gallery */}
          <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-xl overflow-hidden border border-white/20">
            <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=200&q=60" alt="Gallery" className="w-full h-full object-cover" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {/* Capture or Publish */}
          {hasMedia ? (
            <button onClick={handlePublish} disabled={isUploading} className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-primary flex items-center justify-center shadow-xl disabled:opacity-60 active:scale-95 transition-transform">
              {isUploading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-white text-xs font-bold text-center leading-tight">Post<br/>Story</span>}
            </button>
          ) : (
            <button onClick={handleCapture} className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-white p-1 active:scale-90 transition-transform shadow-xl">
              <div className="w-full h-full rounded-full border-4 border-black/15 bg-white" />
            </button>
          )}

          {/* Flip camera — large touch target */}
          <button
            onClick={hasMedia ? () => { setCapturedImage(null); setVideoFile(null); setVideoPreviewUrl(null); setCaption(''); } : handleFlipCamera}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
          >
            {hasMedia ? <X className="w-5 h-5" /> : <FlipHorizontal className="w-5 h-5" />}
          </button>
        </div>

        {/* Video button */}
        {!hasMedia && (
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-white/60 text-xs">
            <Video className="w-4 h-4" /> Upload video
          </button>
        )}
      </div>

      {/* Template picker */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm">
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
                  className={`aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedTemplate?.id === tpl.id ? 'border-white scale-95' : 'border-white/20'
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
              className="w-full py-3 text-xs font-bold text-white/60 hover:text-white border border-white/10 rounded-xl"
            >
              Clear Template
            </button>
          </div>
        </div>
      )}

      {/* Permission denied modal */}
      {permDeniedType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white text-center">{getPermissionDeniedMessage(permDeniedType)}</h3>
            <p className="text-xs text-white/50 text-center">
              {permDeniedType === 'camera' ? 'Camera access is needed to take photos.' : 'Microphone access is needed for recordings.'}
            </p>
            <button onClick={() => setPermDeniedType(null)} className="w-full py-2.5 text-xs font-bold text-white bg-primary rounded-full">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
