import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, X, Sun, Type, Users, FlipHorizontal, Palette, Zap,
  Video, Image as ImageIcon, ZoomIn, RotateCcw, Check, Mic, MicOff
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getPermissionDeniedMessage } from '../lib/permissions';
import { useStorage } from '../hooks/useStorage';
import { createStory } from '../lib/api/stories';
import { STORY_TEMPLATES, StoryTemplate } from '../data/storyTemplates';

interface AddStoryProps {
  onClose: () => void;
  onStoryAdded: (imageSrc: string) => Promise<void> | void;
}

type CameraMode = 'photo' | 'video';
type FilterName = 'normal' | 'cool' | 'sunset' | 'mono';

const FILTERS: Record<FilterName, string> = {
  normal: 'none',
  cool: 'contrast(1.06) saturate(1.12) hue-rotate(8deg)',
  sunset: 'contrast(1.04) saturate(1.2) sepia(.18)',
  mono: 'grayscale(1) contrast(1.08)',
};

function portraitCrop(sourceWidth: number, sourceHeight: number, zoom: number) {
  const targetRatio = 9 / 16;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceWidth / sourceHeight > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
  } else {
    cropHeight = sourceWidth / targetRatio;
  }
  cropWidth = cropWidth / Math.max(1, zoom);
  cropHeight = cropHeight / Math.max(1, zoom);
  return {
    sx: (sourceWidth - cropWidth) / 2,
    sy: (sourceHeight - cropHeight) / 2,
    sw: cropWidth,
    sh: cropHeight,
  };
}

function drawPortraitFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  mirrored: boolean,
  filter: FilterName,
  zoom: number,
) {
  const crop = portraitCrop(sourceWidth, sourceHeight, zoom);
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.filter = FILTERS[filter];
  if (mirrored) {
    ctx.translate(canvasWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();
  ctx.filter = 'none';
}

function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
) {
  if (!text.trim()) return;
  const width = ctx.canvas.width;
  const maxWidth = width * 0.84;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  ctx.save();
  ctx.font = '700 ' + fontSize + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const lineHeight = fontSize * 1.28;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((value, index) => {
    ctx.lineWidth = Math.max(5, fontSize * 0.18);
    ctx.strokeStyle = 'rgba(0,0,0,.58)';
    ctx.lineJoin = 'round';
    ctx.strokeText(value, x, startY + index * lineHeight, maxWidth);
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 8;
    ctx.fillText(value, x, startY + index * lineHeight, maxWidth);
  });
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the selected image.'));
    image.src = src;
  });
}

function getSupportedRecordingType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

export default function AddStoryView({ onClose, onStoryAdded }: AddStoryProps) {
  const [permDeniedType, setPermDeniedType] = useState<'camera' | 'microphone' | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [activeFilter, setActiveFilter] = useState<FilterName>('normal');
  const [flash, setFlash] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
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
  const [cameraMode, setCameraMode] = useState<CameraMode>('photo');
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 });
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(64);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingHasAudio, setRecordingHasAudio] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingAudioRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const textDragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const draggedTextRef = useRef(false);
  const zoomRef = useRef(1);
  const filterRef = useRef<FilterName>('normal');
  const textRef = useRef('');
  const textColorRef = useRef('#ffffff');
  const textSizeRef = useRef(64);
  const textPositionRef = useRef({ x: 50, y: 50 });
  const facingModeRef = useRef<'user' | 'environment'>('environment');

  const { uploadFile } = useStorage();
  const hasMedia = Boolean(capturedImage || videoPreviewUrl);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { filterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { textRef.current = overlayText; }, [overlayText]);
  useEffect(() => { textColorRef.current = textColor; }, [textColor]);
  useEffect(() => { textSizeRef.current = textSize; }, [textSize]);
  useEffect(() => { textPositionRef.current = textPosition; }, [textPosition]);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    cameraTrackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setStoryError(null);
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import('@capacitor/camera');
        const permission = await Camera.requestPermissions({ permissions: ['camera'] });
        if (permission.camera !== 'granted') throw new Error('Camera permission was not granted.');
      } catch (error: any) {
        setHasCameraAccess(false);
        setPermDeniedType('camera');
        setStoryError(error?.message || getPermissionDeniedMessage('camera'));
        return;
      }
    }
    stopCamera();
    const videoConstraints: MediaTrackConstraints[] = [
      {
        facingMode: { ideal: mode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      {
        facingMode: { ideal: mode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    ];
    let mediaStream: MediaStream | null = null;
    let lastError: unknown = null;
    for (const video of videoConstraints) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!mediaStream) {
      console.warn('Camera could not be opened:', lastError);
      setHasCameraAccess(false);
      setPermDeniedType('camera');
      setStoryError(getPermissionDeniedMessage('camera'));
      return;
    }
    streamRef.current = mediaStream;
    const track = mediaStream.getVideoTracks()[0];
    cameraTrackRef.current = track || null;
    const capabilities = (track as any)?.getCapabilities?.();
    const zoomCapability = capabilities?.zoom;
    if (zoomCapability && typeof zoomCapability.min === 'number' && typeof zoomCapability.max === 'number') {
      setHasHardwareZoom(true);
      setZoomRange({ min: zoomCapability.min, max: zoomCapability.max });
      const initialZoom = Math.max(zoomCapability.min, Math.min(1, zoomCapability.max));
      setZoom(initialZoom);
      zoomRef.current = initialZoom;
    } else {
      setHasHardwareZoom(false);
      setZoomRange({ min: 1, max: 4 });
      setZoom(1);
      zoomRef.current = 1;
    }
    setHasCameraAccess(true);
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    });
  }, [stopCamera]);

  useEffect(() => {
    void startCamera(facingMode);
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingAudioRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
      stopCamera();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const applyZoom = async (value: number) => {
    const next = Math.max(zoomRange.min, Math.min(zoomRange.max, value));
    setZoom(next);
    zoomRef.current = next;
    const track = cameraTrackRef.current as any;
    if (hasHardwareZoom && track?.applyConstraints) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: next }] } as any);
      } catch (error) {
        console.warn('Hardware zoom could not be applied; using preview zoom.', error);
        setHasHardwareZoom(false);
      }
    }
  };

  const handleFlipCamera = async () => {
    if (isRecording) return;
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    await startCamera(next);
  };

  const drawLiveFrame = (ctx: CanvasRenderingContext2D) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    drawPortraitFrame(
      ctx,
      video,
      video.videoWidth,
      video.videoHeight,
      facingModeRef.current === 'user',
      filterRef.current,
      hasHardwareZoom ? 1 : zoomRef.current,
    );
    drawOverlayText(
      ctx,
      textRef.current,
      (textPositionRef.current.x / 100) * ctx.canvas.width,
      (textPositionRef.current.y / 100) * ctx.canvas.height,
      textSizeRef.current,
      textColorRef.current,
    );
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!hasCameraAccess || !video || !video.videoWidth || !video.videoHeight) {
      setStoryError('The camera is still starting. Try again in a moment.');
      return;
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setStoryError('Could not process this photo on your device.');
      return;
    }
    drawPortraitFrame(
      ctx,
      video,
      video.videoWidth,
      video.videoHeight,
      facingMode === 'user',
      activeFilter,
      hasHardwareZoom ? 1 : zoom,
    );
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.96));
    setMediaType('image');
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setStoryError(null);
  };

  const startRecording = async () => {
    if (!hasCameraAccess || !streamRef.current || !videoRef.current) {
      setStoryError('Camera is not ready yet.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setStoryError('Video recording is not supported by this browser. Choose a video from your gallery.');
      return;
    }
    const mimeType = getSupportedRecordingType();
    if (!mimeType) {
      setStoryError('This device does not provide a supported video recording format.');
      return;
    }

    let microphoneStream: MediaStream | null = null;
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      recordingHasAudio && setRecordingHasAudio(true);
    } catch {
      setRecordingHasAudio(false);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    recordingCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      microphoneStream?.getTracks().forEach(track => track.stop());
      setStoryError('Could not start the video editor.');
      return;
    }

    const renderFrame = () => {
      drawLiveFrame(ctx);
      recordingFrameRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    const canvasStream = canvas.captureStream(30);
    const audioTracks = microphoneStream?.getAudioTracks() || [];
    const recordingStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);
    recordingAudioRef.current = microphoneStream;
    recordingStreamRef.current = recordingStream;
    recordingChunksRef.current = [];

    try {
      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => setStoryError('The camera recording stopped unexpectedly.');
      recorder.onstop = () => {
        if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
        recordingFrameRef.current = null;
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        const actualMime = (recorder.mimeType || mimeType).split(';')[0];
        const extension = actualMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: actualMime });
        if (blob.size > 0) {
          const file = new File([blob], 'lbt-story-' + Date.now() + '.' + extension, { type: actualMime });
          const url = URL.createObjectURL(file);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setVideoFile(file);
          setVideoPreviewUrl(url);
          setCapturedImage(null);
          setMediaType('video');
          setStoryError(null);
        } else {
          setStoryError('No video data was recorded. Please try again.');
        }
        recordingAudioRef.current?.getTracks().forEach(track => track.stop());
        recordingStreamRef.current?.getTracks().forEach(track => track.stop());
        recordingAudioRef.current = null;
        recordingStreamRef.current = null;
        setIsRecording(false);
      };
      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);
      setStoryError(null);
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 60 && recorder.state === 'recording') recorder.stop();
      }, 250);
    } catch (error: any) {
      if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
      microphoneStream?.getTracks().forEach(track => track.stop());
      canvasStream.getTracks().forEach(track => track.stop());
      recordingStream.getTracks().forEach(track => track.stop());
      setStoryError(error?.message || 'Could not start video recording.');
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) {
        setStoryError('Choose a video smaller than 50 MB.');
        event.target.value = '';
        return;
      }
      const url = URL.createObjectURL(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setMediaType('video');
      setVideoFile(file);
      setVideoPreviewUrl(url);
      setCapturedImage(null);
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setMediaType('image');
      setCapturedImage(url);
      setVideoFile(null);
      setVideoPreviewUrl(null);
    } else {
      setStoryError('Choose an image or video file.');
      event.target.value = '';
      return;
    }
    event.target.value = '';
    setStoryError(null);
  };

  const handleTextPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedTextRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    textDragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: textPosition.x,
      top: textPosition.y,
    };
  };

  const handleTextPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!textDragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = ((event.clientX - textDragRef.current.x) / rect.width) * 100;
    const dy = ((event.clientY - textDragRef.current.y) / rect.height) * 100;
    if (Math.abs(dx) + Math.abs(dy) > 1) draggedTextRef.current = true;
    const next = {
      x: Math.max(8, Math.min(92, textDragRef.current.left + dx)),
      y: Math.max(8, Math.min(92, textDragRef.current.top + dy)),
    };
    setTextPosition(next);
    textPositionRef.current = next;
  };

  const handleTextPointerUp = () => {
    textDragRef.current = null;
  };

  const renderImageStory = async (sourceUrl: string) => {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare your story image.');
    drawPortraitFrame(ctx, image, image.naturalWidth, image.naturalHeight, false, activeFilter, 1);
    drawOverlayText(
      ctx,
      overlayText,
      (textPosition.x / 100) * canvas.width,
      (textPosition.y / 100) * canvas.height,
      textSize,
      textColor,
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not export the story image.')), 'image/jpeg', 0.96);
    });
    return new File([blob], 'lbt-story-' + Date.now() + '.jpg', { type: 'image/jpeg' });
  };

  const handlePublish = async () => {
    if (!hasMedia || isUploading || isRecording) return;
    setIsUploading(true);
    setStoryError(null);
    try {
      let mediaUrl = '';
      if (mediaType === 'video' && videoFile) {
        mediaUrl = await uploadFile('stories', videoFile);
      } else if (capturedImage) {
        const imageFile = await renderImageStory(capturedImage);
        mediaUrl = await uploadFile('stories', imageFile);
      }
      if (!mediaUrl) throw new Error('Select or capture a photo or video first.');
      await createStory(mediaUrl, {
        mediaType,
        caption: caption.trim() || undefined,
        audience: closeFriendsOnly ? 'close_friends' : 'public',
      });
      await onStoryAdded(mediaUrl);
      onClose();
    } catch (error: any) {
      setStoryError(error?.message || 'Failed to publish story.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTorchToggle = async () => {
    const next = !torchEnabled;
    const track = cameraTrackRef.current as any;
    try {
      if (track?.applyConstraints) {
        await track.applyConstraints({ advanced: [{ torch: next }] } as any);
      }
      setTorchEnabled(next);
    } catch {
      setStoryError('Flash is not supported by this camera.');
    }
  };

  const handlePinchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    pinchRef.current = { distance: Math.hypot(dx, dy), zoom };
  };

  const handlePinchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const distance = Math.hypot(dx, dy);
    const next = pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance));
    void applyZoom(next);
  };

  const resetMedia = () => {
    setCapturedImage(null);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setOverlayText('');
    setCaption('');
    setZoom(1);
    zoomRef.current = 1;
  };

  return (
    <div className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-black text-white select-none">
      {flash && <div className="absolute inset-0 z-[100] bg-white pointer-events-none" />}
      <div
        ref={stageRef}
        className="absolute inset-0 z-0 overflow-hidden bg-zinc-950"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handlePinchStart}
        onTouchMove={handlePinchMove}
        onTouchEnd={() => { pinchRef.current = null; }}
      >
        {selectedTemplate && !hasMedia && (
          <div className="absolute inset-0" style={{ background: selectedTemplate.gradient }} />
        )}
        {mediaType === 'video' && videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            playsInline
            loop
            muted
          />
        ) : capturedImage ? (
          <img src={capturedImage} alt="Story preview" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: FILTERS[activeFilter], transform: (facingMode === 'user' ? 'scaleX(-1) ' : '') + (!hasHardwareZoom ? 'scale(' + zoom + ')' : '') }}
            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
          />
        )}

        {overlayText && (
          <div
            role="button"
            aria-label="Move story text"
            className="absolute z-20 max-w-[86%] -translate-x-1/2 -translate-y-1/2 text-center font-bold leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,.65)]"
            style={{
              left: textPosition.x + '%',
              top: textPosition.y + '%',
              color: textColor,
              fontSize: Math.max(18, textSize / 3) + 'px',
              touchAction: 'none',
              textShadow: '0 2px 10px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.8)',
            }}
            onPointerDown={handleTextPointerDown}
            onPointerMove={handleTextPointerMove}
            onPointerUp={handleTextPointerUp}
            onPointerCancel={handleTextPointerUp}
            onClick={() => { if (!draggedTextRef.current) setIsTypingText(true); }}
          >
            {overlayText}
          </div>
        )}
      </div>

      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onClose} aria-label="Close camera" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-xl active:scale-90">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleTorchToggle} aria-label="Toggle flash" className={'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 backdrop-blur-xl ' + (torchEnabled ? 'bg-amber-400 text-black' : 'bg-black/35 text-white')}>
            <Zap className="h-4 w-4" />
          </button>
          <button onClick={() => setShowTemplatePicker(true)} aria-label="Story backgrounds" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-xl">
            <Palette className="h-4 w-4" />
          </button>
          <button onClick={() => setIsTypingText(true)} aria-label="Add text" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-xl">
            <Type className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!hasMedia && hasCameraAccess && (
        <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+70px)] z-30 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 backdrop-blur-xl">
          <ZoomIn className="h-4 w-4 shrink-0 text-white/80" />
          <input
            aria-label="Camera zoom"
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step="0.1"
            value={zoom}
            onChange={event => void applyZoom(Number(event.target.value))}
            className="min-w-0 flex-1 accent-white"
          />
          <span className="w-11 text-right text-[11px] font-semibold tabular-nums">{zoom.toFixed(1)}×</span>
        </div>
      )}

      {!hasCameraAccess && !hasMedia && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 pt-24 text-center">
          <div className="max-w-xs">
            <Camera className="mx-auto mb-4 h-14 w-14 text-white/45" />
            <p className="text-sm font-semibold">Camera unavailable</p>
            <p className="mt-2 text-xs text-white/55">Allow camera access or choose a photo or video from your gallery.</p>
            <button onClick={() => void startCamera(facingMode)} className="mt-4 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black">Try camera again</button>
          </div>
        </div>
      )}

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+12px)] left-0 right-0 z-30 px-4">
        {storyError && (
          <div className="mx-auto mb-3 max-w-md rounded-2xl border border-red-400/25 bg-red-950/65 px-4 py-3 text-center text-xs font-medium text-red-100 backdrop-blur-xl">
            {storyError}
          </div>
        )}

        {hasMedia && (
          <div className="mx-auto mb-3 flex max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-black/35 p-2 backdrop-blur-xl">
            <input
              type="text"
              value={caption}
              onChange={event => setCaption(event.target.value)}
              placeholder="Add a story caption..."
              maxLength={150}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-white/45"
            />
            <button
              onClick={() => setCloseFriendsOnly(value => !value)}
              aria-label="Share with close friends only"
              className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' + (closeFriendsOnly ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/65')}
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        )}

        {overlayText && !hasMedia && (
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] text-white/75 backdrop-blur-xl">Drag text to move it</span>
          </div>
        )}

        {!hasMedia && (
          <div className="mb-3 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-black/35 p-1 backdrop-blur-xl">
            <button onClick={() => setCameraMode('photo')} className={'rounded-full px-5 py-2 text-[11px] font-bold transition ' + (cameraMode === 'photo' ? 'bg-white text-black' : 'text-white/65')}>PHOTO</button>
            <button onClick={() => setCameraMode('video')} className={'rounded-full px-5 py-2 text-[11px] font-bold transition ' + (cameraMode === 'video' ? 'bg-white text-black' : 'text-white/65')}>VIDEO · 60s</button>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-sm items-center justify-between">
          <button onClick={() => fileInputRef.current?.click()} aria-label="Choose media from gallery" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/35 backdrop-blur-xl active:scale-90">
            <ImageIcon className="h-5 w-5 text-white/90" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {hasMedia ? (
            <button onClick={handlePublish} disabled={isUploading} className="flex h-[76px] min-w-[76px] items-center justify-center rounded-full bg-white px-4 text-black shadow-2xl shadow-black/30 transition active:scale-90 disabled:opacity-60">
              {isUploading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <span className="flex flex-col items-center gap-1 text-xs font-extrabold"><Check className="h-5 w-5" />Share</span>}
            </button>
          ) : cameraMode === 'photo' ? (
            <button onClick={handleCapture} disabled={!hasCameraAccess} aria-label="Take photo" className="relative h-[78px] w-[78px] rounded-full border-[5px] border-white p-[5px] transition active:scale-90 disabled:opacity-40">
              <span className="block h-full w-full rounded-full bg-white" />
            </button>
          ) : (
            <button
              onClick={() => isRecording ? stopRecording() : void startRecording()}
              disabled={!hasCameraAccess}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full border-[5px] border-white transition active:scale-90 disabled:opacity-40"
            >
              <span className={'block rounded-full transition-all ' + (isRecording ? 'h-8 w-8 rounded-lg bg-red-500' : 'h-14 w-14 bg-red-500')} />
            </button>
          )}

          <button
            onClick={hasMedia ? resetMedia : handleFlipCamera}
            aria-label={hasMedia ? 'Discard selected story' : 'Flip camera'}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-xl active:scale-90"
          >
            {hasMedia ? <RotateCcw className="h-5 w-5" /> : <FlipHorizontal className="h-5 w-5" />}
          </button>
        </div>

        {isRecording ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold tabular-nums text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
            {!recordingHasAudio && <span className="flex items-center gap-1 text-white/55"><MicOff className="h-3 w-3" />No mic</span>}
          </div>
        ) : (
          <div className="mt-3 text-center text-[10px] font-medium text-white/55">
            {cameraMode === 'photo' ? 'Tap to capture · Pinch or slide to zoom' : 'Tap the red button to start or stop recording'}
          </div>
        )}

        {hasMedia && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {(['normal', 'cool', 'sunset', 'mono'] as FilterName[]).map(filter => (
              <button key={filter} onClick={() => setActiveFilter(filter)} className={'rounded-full border px-3 py-1.5 text-[10px] font-semibold capitalize ' + (activeFilter === filter ? 'border-white bg-white text-black' : 'border-white/15 bg-black/35 text-white/75')}>
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      {isTypingText && (
        <div className="absolute inset-0 z-[70] flex flex-col justify-center bg-black/85 px-6 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Story text</h3>
              <button onClick={() => setIsTypingText(false)} aria-label="Close text editor" className="rounded-full bg-white/10 p-2"><X className="h-5 w-5" /></button>
            </div>
            <textarea
              value={overlayText}
              onChange={event => setOverlayText(event.target.value.slice(0, 120))}
              placeholder="Write something..."
              rows={3}
              autoFocus
              className="w-full resize-none rounded-2xl border border-white/15 bg-white/10 p-4 text-center text-xl font-semibold outline-none placeholder:text-white/40 focus:border-white/50"
            />
            <div className="mt-5 flex items-center justify-center gap-3">
              {['#ffffff', '#111111', '#ffdf70', '#ff7f96', '#8ed7ff', '#9ff0c4'].map(color => (
                <button key={color} onClick={() => setTextColor(color)} aria-label={'Text color ' + color} className={'h-8 w-8 rounded-full border-2 ' + (textColor === color ? 'border-white scale-110' : 'border-white/20')} style={{ backgroundColor: color }} />
              ))}
            </div>
            <label className="mt-6 block text-xs font-semibold text-white/65">Text size</label>
            <input type="range" min="36" max="100" step="2" value={textSize} onChange={event => setTextSize(Number(event.target.value))} className="mt-2 w-full accent-white" />
            <button onClick={() => setIsTypingText(false)} className="mt-6 w-full rounded-full bg-white py-3 text-sm font-extrabold text-black active:scale-[.98]">Done</button>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div className="absolute inset-0 z-[60] flex items-end bg-black/65 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)}>
          <div className="w-full rounded-t-3xl border-t border-white/10 bg-zinc-950 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Story backgrounds</h3>
              <button onClick={() => setShowTemplatePicker(false)} className="rounded-full p-2 text-white/65"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {STORY_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => { setSelectedTemplate(selectedTemplate?.id === template.id ? null : template); setShowTemplatePicker(false); }}
                  className={'flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-2xl border-2 ' + (selectedTemplate?.id === template.id ? 'border-white' : 'border-white/10')}
                  style={{ background: template.gradient }}
                >
                  <span className="text-2xl">{template.emoji}</span>
                  <span className="text-[9px] font-bold">{template.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { setSelectedTemplate(null); setShowTemplatePicker(false); }} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-xs font-bold text-white/65">Clear background</button>
          </div>
        </div>
      )}

      {permDeniedType && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 text-center">
            <Camera className="mx-auto mb-3 h-9 w-9 text-white/65" />
            <h3 className="text-sm font-bold">{getPermissionDeniedMessage(permDeniedType)}</h3>
            <p className="mt-2 text-xs text-white/55">{permDeniedType === 'camera' ? 'Camera access is required to take a story.' : 'Microphone access is needed for story audio.'}</p>
            <button onClick={() => setPermDeniedType(null)} className="mt-5 w-full rounded-full bg-white py-3 text-xs font-extrabold text-black">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
