import React from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';

export default function ProSettings(_props: Record<string, any>) {
  return (
    <section className="space-y-4 animate-fadeIn">
      <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-on-surface">LBT Pro is not available yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          Premium features and billing are still being developed. You cannot subscribe from this screen, and LBT will never ask you to enter card details until a secure payment provider is connected.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
          <LockKeyhole className="h-4 w-4 shrink-0" />
          No payment is collected here.
        </div>
      </div>
    </section>
  );
}
