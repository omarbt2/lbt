import React from 'react';
import { ShieldCheck, Laptop, Smartphone, AlertTriangle, LockKeyhole } from 'lucide-react';

interface SecuritySettingsProps {
  currentPass: string;
  setCurrentPass: (v: string) => void;
  newPass: string;
  setNewPass: (v: string) => void;
  confirmPass: string;
  setConfirmPass: (v: string) => void;
  passFeedback: { text: string; success: boolean } | null;
  handleUpdatePassword: (e: React.FormEvent) => void;
  sms2FA: boolean;
  setSms2FA: (v: boolean) => void;
  app2FA: boolean;
  setApp2FA: (v: boolean) => void;
  phonePrefix: string;
  phoneNum: string;
  activeDevices: { id: string; device: string; location: string; time: string; isCurrent: boolean }[];
  showDeletionConfirm: boolean;
  setShowDeletionConfirm: (v: boolean) => void;
  onLogout: () => void;
}

export default function SecuritySettings({
  currentPass, setCurrentPass, newPass, setNewPass, confirmPass, setConfirmPass,
  passFeedback, handleUpdatePassword, activeDevices,
}: SecuritySettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <h3 className="text-sm font-bold text-on-surface">Change password</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Use a unique password with at least 8 characters.</p>
        {passFeedback && <div className={'mt-3 rounded-xl p-3 text-xs font-semibold ' + (passFeedback.success ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error')}>{passFeedback.text}</div>}
        <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3">
          <input required autoComplete="current-password" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Current password" aria-label="Current password" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm outline-none focus:border-primary" />
          <input required minLength={8} autoComplete="new-password" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" aria-label="New password" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm outline-none focus:border-primary" />
          <input required minLength={8} autoComplete="new-password" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm new password" aria-label="Confirm new password" className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm outline-none focus:border-primary" />
          <button type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition active:scale-[.98]">Update password</button>
        </form>
      </section>

      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-on-surface">Two-factor authentication</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Additional verification methods are not configured in this version.</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          The previous switches did not enable real SMS or authenticator verification, so they have been removed rather than showing a false security status.
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <h3 className="text-sm font-bold text-on-surface">This device</h3>
        <div className="mt-3 space-y-3">
          {activeDevices.map(device => (
            <div key={device.id} className="flex items-center gap-3">
              {device.device.includes('Mobile') ? <Smartphone className="h-5 w-5 text-primary" /> : <Laptop className="h-5 w-5 text-primary" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-on-surface">{device.device}</p>
                <p className="text-[10px] text-on-surface-variant">{device.location} · {device.time}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${device.isCurrent ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{device.isCurrent ? 'This device' : 'Registered'}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-on-surface-variant">These are app installations registered to your account. A registered device is not proof of a currently active Supabase login session.</p>
      </section>

      <section className="rounded-2xl border border-error/20 bg-error/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div>
            <h3 className="text-sm font-bold text-error">Account deletion</h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Permanent account deletion requires a secure server-side workflow. It is not available yet; this screen will not pretend that logging out deletes your account.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
