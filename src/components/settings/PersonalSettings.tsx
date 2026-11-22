import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PersonalSettingsProps {
  editPic: string | null;
  setEditPic: (v: string | null) => void;
  editName: string;
  setEditName: (v: string) => void;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editBio: string;
  setEditBio: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  isEmailVerifying: boolean;
  isEmailVerified: boolean;
  handleDemoVerifyEmail: () => void;
  phonePrefix: string;
  setPhonePrefix: (v: string) => void;
  phoneNum: string;
  setPhoneNum: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  saveFeedback: string | null;
  handleSavePersonalInfo: () => void;
  isUsernameTaken: boolean;
}

export default function PersonalSettings({
  editPic, setEditPic, editName, setEditName, editUsername, setEditUsername,
  editBio, setEditBio, editEmail, setEditEmail, isEmailVerifying, isEmailVerified,
  handleDemoVerifyEmail, phonePrefix, setPhonePrefix, phoneNum, setPhoneNum,
  dob, setDob, gender, setGender, saveFeedback, handleSavePersonalInfo, isUsernameTaken,
}: PersonalSettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 flex items-center gap-4 border-b border-outline-variant/10">
          <img src={editPic || undefined} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" alt="" />
          <div className="flex-1">
            <p className="text-xs font-bold text-on-surface">{editName || 'Your Name'}</p>
            <p className="text-[10px] text-outline">@{editUsername}</p>
          </div>
          <button
            onClick={() => {
              setEditPic(null);
            }}
            className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
          >
            Change
          </button>
        </div>

        {saveFeedback && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold ${saveFeedback.startsWith('!') ? 'bg-error/10 text-error' : 'bg-surface-container-low text-on-surface'}`}>
            {saveFeedback}
          </div>
        )}

        <div className="p-4 space-y-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Full Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/30 border border-outline-variant/20" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">@</span>
              <input type="text" value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9__-]/g, ''))}
                className={`w-full bg-surface-container rounded-xl pl-7 pr-4 py-2.5 text-xs text-on-surface outline-none border ${isUsernameTaken ? 'border-error' : 'border-outline-variant/20 focus:ring-1 focus:ring-primary/30'}`} />
            </div>
            <p className={`text-[10px] font-bold ${isUsernameTaken ? 'text-error' : 'text-on-surface'}`}>
              {isUsernameTaken ? 'Username taken' : 'Available'}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Bio</label>
            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
              className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/30 border border-outline-variant/20 resize-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Email</label>
            <div className="flex gap-2">
              <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); }}
                className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20" />
              {isEmailVerified ? (
                <span className="bg-surface-container-low text-on-surface text-[10px] font-bold px-3 py-2.5 rounded-xl flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <button onClick={handleDemoVerifyEmail} disabled={isEmailVerifying}
                  className="bg-primary text-white text-[10px] font-bold px-3 py-2.5 rounded-xl disabled:opacity-50">
                  {isEmailVerifying ? '...' : 'Verify'}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Phone</label>
            <div className="flex gap-2">
              <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)}
                className="bg-surface-container border border-outline-variant/20 rounded-xl px-2.5 py-2.5 text-xs font-bold outline-none shrink-0"
                aria-label="Phone prefix">
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+213">🇩🇿 +213</option>
              </select>
              <input type="text" value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)}
                className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20 font-mono"
                aria-label="Phone number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20 font-mono" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20">
                <option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={handleSavePersonalInfo}
            className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl active:scale-98 transition-transform">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
