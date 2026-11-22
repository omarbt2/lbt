import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SettingsShellProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export default function SettingsShell({ title, onBack, children }: SettingsShellProps) {
  return (
    <div className="flex flex-col gap-4 animate-fadeIn py-3 max-w-xl mx-auto text-on-surface">
      <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/30">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-surface-container text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}
