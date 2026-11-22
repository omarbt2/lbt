import React from 'react';
import {
  Moon, Sun, Type, Languages, ChevronRight
} from 'lucide-react';
import { Toggle } from './SettingsHelpers';

interface AppearanceSettingsProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  textSize: string;
  language: string;
  openInlineSheet: (sheet: 'dms' | 'language' | 'textsize') => void;
}

export default function AppearanceSettings({
  darkMode, toggleDarkMode, textSize, language, openInlineSheet,
}: AppearanceSettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-4 h-4 text-on-surface-variant" /> : <Sun className="w-4 h-4 text-on-surface-variant" />}
            <div>
              <span className="text-xs font-bold text-on-surface block">Dark Mode</span>
              <span className="text-[10px] text-outline">{darkMode ? 'Dark theme active' : 'Light theme active'}</span>
            </div>
          </div>
          <Toggle enabled={darkMode} onToggle={toggleDarkMode} />
        </div>
        <div onClick={() => openInlineSheet('textsize')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <Type className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Text Size</span>
              <span className="text-[10px] text-outline capitalize">{textSize}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-outline" />
        </div>
        <div onClick={() => openInlineSheet('language')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <Languages className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block">Language</span>
              <span className="text-[10px] text-outline">{language === 'en' ? 'English' : language === 'fr' ? 'Francais' : language === 'ar' ? 'العربية' : language}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-outline" />
        </div>
      </div>
    </div>
  );
}
