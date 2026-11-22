import React from 'react';
import {
  Play, Wifi, ImageIcon
} from 'lucide-react';
import { Toggle } from './SettingsHelpers';

interface MediaSettingsProps {
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  dataSaver: boolean;
  setDataSaver: (v: boolean) => void;
  highQualityUploads: boolean;
  setHighQualityUploads: (v: boolean) => void;
}

export default function MediaSettings({
  autoPlay, setAutoPlay, dataSaver, setDataSaver, highQualityUploads, setHighQualityUploads,
}: MediaSettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div onClick={() => setAutoPlay(!autoPlay)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
          <div className="flex items-center gap-3">
            <Play className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Auto-Play Videos</span>
              <span className="text-[10px] text-outline">Videos play automatically in feed</span>
            </div>
          </div>
          <Toggle enabled={autoPlay} onToggle={() => setAutoPlay(!autoPlay)} />
        </div>
        <div onClick={() => setDataSaver(!dataSaver)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <Wifi className="w-4 h-4 text-on-surface-variant" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Data Saver</span>
              <span className="text-[10px] text-outline">Reduce data usage on mobile</span>
            </div>
          </div>
          <Toggle enabled={dataSaver} onToggle={() => setDataSaver(!dataSaver)} />
        </div>
        <div onClick={() => setHighQualityUploads(!highQualityUploads)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-4 h-4 text-on-surface-variant" />
            <div>
              <span className="text-xs font-bold text-on-surface block">High-Quality Uploads</span>
              <span className="text-[10px] text-outline">Upload photos in original quality</span>
            </div>
          </div>
          <Toggle enabled={highQualityUploads} onToggle={() => setHighQualityUploads(!highQualityUploads)} />
        </div>
      </div>
    </div>
  );
}
