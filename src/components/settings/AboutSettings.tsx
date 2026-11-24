import React from 'react';
import { ChevronDown } from 'lucide-react';
import LbtLogo from '../LbtLogo';

export default function AboutSettings() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 text-center space-y-5 animate-fadeIn">
      <div className="flex flex-col items-center gap-2">
        <LbtLogo size="md" />
        <h2 className="text-base font-black text-on-surface">LBT Social</h2>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">v1.0.0</span>
      </div>
      <div className="text-left space-y-2 border-y border-outline-variant/15 py-4">
        <details className="group border border-outline-variant/20 rounded-xl overflow-hidden">
          <summary className="p-3 font-bold text-xs text-on-surface flex justify-between cursor-pointer list-none">
            <span>Terms of Service</span>
            <ChevronDown className="w-4 h-4 text-primary group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-4 pb-3 text-[11px] text-outline leading-relaxed border-t border-outline-variant/15 pt-2">
            By using LBT, you agree to comply with design licensing rights. All user assets remain properties of their creators.
          </div>
        </details>
        <details className="group border border-outline-variant/20 rounded-xl overflow-hidden">
          <summary className="p-3 font-bold text-xs text-on-surface flex justify-between cursor-pointer list-none">
            <span>Privacy Policy</span>
            <ChevronDown className="w-4 h-4 text-primary group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-4 pb-3 text-[11px] text-outline leading-relaxed border-t border-outline-variant/15 pt-2">
            We handle your data privately. LBT does not share metrics with third parties.
          </div>
        </details>
      </div>
    </div>
  );
}
