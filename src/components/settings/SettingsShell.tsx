import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SettingsShellProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export default function SettingsShell({ title, onBack, children }: SettingsShellProps) {
  return (
    <div className="lbt-settings-page flex flex-col gap-4 animate-fadeIn py-3 text-on-surface">
      <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/30">
        <button
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-outline-variant/30 bg-surface-container-lowest/80 text-primary shadow-sm transition-colors hover:bg-surface-container"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}
