import React from 'react';
import {
  Phone, ShieldCheck, Laptop, Smartphone, AlertTriangle
} from 'lucide-react';

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
  activeDevices: { id: string; device: string; location: string; time: string; isCurrent: boolean; }[];
  showDeletionConfirm: boolean;
  setShowDeletionConfirm: (v: boolean) => void;
  onLogout: () => void;
}

export default function SecuritySettings({
  currentPass, setCurrentPass, newPass, setNewPass, confirmPass, setConfirmPass,
  passFeedback, handleUpdatePassword, sms2FA, setSms2FA, app2FA, setApp2FA,
  phonePrefix, phoneNum, activeDevices, showDeletionConfirm, setShowDeletionConfirm, onLogout,
}: SecuritySettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
        <h3 className="text-xs font-bold text-on-surface">Change Password</h3>
        {passFeedback && (
          <div className={`p-3 rounded-xl text-xs font-bold ${passFeedback.success ? 'bg-surface-container-low text-on-surface' : 'bg-error/10 text-error'}`}>
            {passFeedback.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="Current password" aria-label="Current password" className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20" />
          <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
            placeholder="New password (min 8 chars)" aria-label="New password" className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20" />
          <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Confirm new password" aria-label="Confirm new password" className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20" />
          <button type="submit" className="w-full bg-primary text-white font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform">
            Update Password
          </button>
        </form>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="text-xs font-bold text-on-surface">Two-Factor Authentication</h3>
        </div>
        <div onClick={() => setSms2FA(!sms2FA)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-on-surface block">SMS Verification</span>
              <span className="text-[10px] text-outline">Codes to {phonePrefix} {phoneNum.slice(0, 4)}***</span>
              <p className="text-[10px] text-outline mt-0.5">SMS verification will send a code to your registered phone number each time you log in.</p>
            </div>
          </div>
          <div className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${sms2FA ? 'bg-primary' : 'bg-outline-variant'}`}>
            <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${sms2FA ? 'translate-x-[18px]' : ''}`} />
          </div>
        </div>
        <div onClick={() => setApp2FA(!app2FA)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface">Authenticator App</span>
          </div>
          <div className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${app2FA ? 'bg-primary' : 'bg-outline-variant'}`}>
            <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${app2FA ? 'translate-x-[18px]' : ''}`} />
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="text-xs font-bold text-on-surface">Active Devices</h3>
        </div>
        {activeDevices.map(dev => (
          <div key={dev.id} className="flex items-center justify-between p-4 border-b border-outline-variant/5 last:border-0">
            <div className="flex items-center gap-3">
              {dev.device.includes('Mobile')
                ? <Smartphone className="w-4 h-4 text-primary" />
                : <Laptop className="w-4 h-4 text-primary" />}
              <div>
                <span className="text-xs font-bold text-on-surface block">{dev.device}</span>
                <span className="text-[10px] text-outline">{dev.location} · {dev.time}</span>
              </div>
            </div>
            {dev.isCurrent && (
              <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-bold">
                Current
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="bg-error/5 border border-error/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-error">Delete Account</h4>
            <p className="text-[10px] text-outline mt-0.5">Permanently remove your account and data.</p>
          </div>
        </div>
        {showDeletionConfirm ? (
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 space-y-2">
            <p className="text-[11px] font-bold text-on-surface text-center">This action is irreversible!</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeletionConfirm(false); onLogout(); }}
                className="flex-1 bg-error text-white font-bold text-[10px] py-2 rounded-lg">Delete</button>
              <button onClick={() => setShowDeletionConfirm(false)}
                className="flex-1 bg-surface-container text-on-surface-variant font-bold text-[10px] py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowDeletionConfirm(true)}
            className="text-[10px] font-bold text-error border border-error/20 px-4 py-2 rounded-xl">
            Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
