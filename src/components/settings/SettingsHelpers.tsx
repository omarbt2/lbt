import React from 'react';
import { ChevronRight } from 'lucide-react';

const SettingsRow = ({ icon, label, sublabel, right, onClick, destructive }: {
  icon: React.ReactNode; label: string; sublabel?: string; right?: React.ReactNode; onClick?: () => void; destructive?: boolean;
}) => (
  <div onClick={onClick} className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer hover:bg-surface-container/30' : ''} transition-all`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
        {icon}
      </div>
      <div>
        <span className={`text-xs font-bold block ${destructive ? 'text-error' : 'text-on-surface'}`}>{label}</span>
        {sublabel && <span className="text-[10px] text-outline">{sublabel}</span>}
      </div>
    </div>
    {right || <ChevronRight className="w-4 h-4 text-outline" />}
  </div>
);

const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <div onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${enabled ? 'bg-primary' : 'bg-outline-variant'}`}>
    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${enabled ? 'translate-x-[18px]' : ''}`} />
  </div>
);

const MemoizedSettingsRow = React.memo(SettingsRow);
const MemoizedToggle = React.memo(Toggle);

export { MemoizedSettingsRow as SettingsRow, MemoizedToggle as Toggle };
