import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { useAuthStore } from '../store/authStore';
import {
  User as UserIcon, Bell, Shield, HelpCircle, Info, LogOut, Star,
  Settings, BarChart3, ArrowLeft, ChevronRight, Search, CreditCard,
  ChevronDown, ChevronUp, Laptop, Smartphone, Mail, Phone,
  ShieldCheck, Heart, MessageSquare, AlertTriangle, Moon, Sun,
  UserX, Eye, EyeOff, MessageCircle, Play, Wifi, Image as ImageIcon,
  FileText, FileCheck, UserMinus, Trash2, Check, Repeat2, Type, Languages, Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, darkMode, toggleDarkMode, triggerToast } = useOutletContext<OutletContextType>();
  const onNavigateToInsights = () => navigate('/insights');
  const onLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      useAuthStore.getState().logout();
      triggerToast('Logged Out');
    }
  };

  const [activeSubpage, setActiveSubpage] = useState<'personal' | 'security' | 'notifications' | 'faq' | 'about' | 'pro' | 'privacy' | 'appearance' | 'media' | null>(null);
  const [inlineSheet, setInlineSheet] = useState<'dms' | 'language' | 'textsize' | null>(null);

  // --- State ---
  const [editPic, setEditPic] = useState<string | null>(currentUser.avatar);
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editUsername, setEditUsername] = useState<string>(currentUser.username);
  const [editBio, setEditBio] = useState<string>(currentUser.bio || '');
  const [editEmail, setEditEmail] = useState<string>('');
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState('+1');
  const [phoneNum, setPhoneNum] = useState(currentUser.phone || '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const TAKEN_USERNAMES = ['elena_r', 'mchen_design', 'sarah_j', 'chloe_creates', 'mikeross_tech', 'david_kim'];

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passFeedback, setPassFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [sms2FA, setSms2FA] = useState(true);
  const [app2FA, setApp2FA] = useState(false);
  const [activeDevices, setActiveDevices] = useState<{
    id: string; device: string; location: string; time: string; isCurrent: boolean;
  }[]>([]);
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad/i.test(userAgent);
      const deviceName = isMobile ? 'Mobile Device' : 'Desktop Browser';
      const browser = userAgent.includes('Chrome') ? 'Chrome'
        : userAgent.includes('Firefox') ? 'Firefox'
        : userAgent.includes('Safari') ? 'Safari' : 'Browser';
      setActiveDevices([{
        id: 'current',
        device: `${deviceName} (${browser})`,
        location: 'Current session',
        time: 'Active now',
        isCurrent: true,
      }]);
    };
    loadSessions();
  }, []);

  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDMs, setNotifDMs] = useState(true);
  const [notifFollowers, setNotifFollowers] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Privacy settings
  const [privateAccount, setPrivateAccount] = useState(false);
  const [hideActivity, setHideActivity] = useState(false);
  const [allowMentions, setAllowMentions] = useState('everyone');
  const [blockedCount, setBlockedCount] = useState(0);
  const [mutedCount, setMutedCount] = useState(0);

  // Appearance
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [language, setLanguage] = useState('en');
  const [autoPlay, setAutoPlay] = useState(true);

  // Media
  const [dataSaver, setDataSaver] = useState(false);
  const [highQualityUploads, setHighQualityUploads] = useState(true);

  // DM settings
  const [dmFromEveryone, setDmFromEveryone] = useState(true);
  const [dmShowPreview, setDmShowPreview] = useState(true);

  const updateNotifPref = async (field: string, value: boolean) => {
    await (supabase.from('profiles') as any).update({ [field]: value }).eq('id', currentUser.id);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    (supabase.from('profiles') as any)
      .select('notif_likes, notif_comments, notif_dms, notif_followers')
      .eq('id', currentUser.id)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setNotifLikes(data.notif_likes ?? true);
          setNotifComments(data.notif_comments ?? true);
          setNotifDMs(data.notif_dms ?? true);
          setNotifFollowers(data.notif_followers ?? false);
        }
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (supabase.from('profiles') as any)
      .select('is_private, hide_activity, allow_mentions, blocked_count, muted_count')
      .eq('id', currentUser.id)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setPrivateAccount(data.is_private ?? false);
          setHideActivity(data.hide_activity ?? false);
          setAllowMentions(data.allow_mentions ?? 'everyone');
          setBlockedCount(data.blocked_count ?? 0);
          setMutedCount(data.muted_count ?? 0);
        }
      });
  }, [currentUser?.id]);

  const updateProfileField = async (field: string, value: any) => {
    await (supabase.from('profiles') as any).update({ [field]: value }).eq('id', currentUser.id);
  };

  // --- SettingsRow component ---
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

  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<'all' | 'account' | 'privacy' | 'pro'>('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');
  const [upgradeGateway, setUpgradeGateway] = useState<'apple' | 'google' | 'card' | null>(null);
  const [ccName, setCcName] = useState('');
  const [ccNum, setCcNum] = useState('');
  const [ccExp, setCcExp] = useState('');
  const [ccCvc, setCcCvc] = useState('');
  const [proSuccess, setProSuccess] = useState(false);

  const FAQS = [
    { id: 1, cat: 'pro' as const, q: 'How do I upgrade to LBT Premium Pro?', a: 'Go to LBT Pro Account, select Monthly/Yearly, and check out via Apple Pay, Google Pay, or Credit Card.' },
    { id: 2, cat: 'privacy' as const, q: 'Is my data kept secure?', a: 'Yes. LBT processes all data with encrypted storage vaults.' },
    { id: 3, cat: 'account' as const, q: 'How do I change my username?', a: 'Go to Settings > Personal Information. Enter any non-taken username.' },
    { id: 4, cat: 'privacy' as const, q: 'How do I enable 2FA?', a: 'Navigate to Settings > Security. Enable via SMS or Authenticator App.' },
    { id: 5, cat: 'pro' as const, q: 'Can Pro accounts customize insights?', a: 'Yes. Pro unlocks 30-day analytics and demographic maps.' }
  ];

  const isUsernameTaken = editUsername !== currentUser.username && TAKEN_USERNAMES.includes(editUsername.toLowerCase());

  const handleSavePersonalInfo = async () => {
    if (isUsernameTaken) { setSaveFeedback('Username is already taken!'); return; }
    if (!editName.trim() || !editUsername.trim()) { setSaveFeedback('Name and username required!'); return; }
    try {
      const { updateProfile } = await import('../lib/api/profiles');
      await updateProfile({
        display_name: editName.trim(),
        username: editUsername.toLowerCase().trim(),
        avatar_url: editPic || undefined,
        bio: editBio.trim(),
        phone: phoneNum ? `${phonePrefix} ${phoneNum}` : undefined,
        dob: dob || undefined,
        gender: gender || undefined,
      });
      await useAuthStore.getState().initialize();
    } catch (err) {
      setSaveFeedback('Failed to save profile.'); return;
    }
    setSaveFeedback('Profile updated!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) { setPassFeedback({ text: 'All fields required!', success: false }); return; }
    if (newPass !== confirmPass) { setPassFeedback({ text: 'Passwords must match!', success: false }); return; }
    if (newPass.length < 8) { setPassFeedback({ text: 'Min 8 characters.', success: false }); return; }
    if (!window.confirm('Are you sure you want to change your password?')) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setPassFeedback({ text: 'No user found.', success: false }); return; }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPass });
      if (authError) { setPassFeedback({ text: 'Current password incorrect.', success: false }); return; }
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setPassFeedback({ text: 'Password updated!', success: true });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      setPassFeedback({ text: err?.message || 'Failed.', success: false });
    }
    setTimeout(() => setPassFeedback(null), 4000);
  };

  const handleDemoVerifyEmail = () => {
    setIsEmailVerifying(true);
    setTimeout(() => { setIsEmailVerifying(false); setIsEmailVerified(true); }, 2500);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    setTicketStatus('sending');
    setTimeout(() => {
      setTicketStatus('success'); setTicketSubject(''); setTicketDesc('');
      setTimeout(() => setTicketStatus('idle'), 4000);
    }, 2000);
  };

  const handleCardUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccNum || !ccName) return;
    setProSuccess(true);
    setTimeout(() => { setProSuccess(false); setActiveSubpage(null); }, 2500);
  };

  // --- Subpage header ---
  if (activeSubpage) {
    return (
      <div className="flex flex-col gap-4 animate-fadeIn py-3 max-w-xl mx-auto text-on-surface">
        <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/30">
          <button
            onClick={() => { setActiveSubpage(null); setSaveFeedback(null); setPassFeedback(null); }}
            className="p-1.5 rounded-full hover:bg-surface-container text-primary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-on-surface">
              {activeSubpage === 'personal' && 'Personal Information'}
              {activeSubpage === 'security' && 'Security & Password'}
              {activeSubpage === 'notifications' && 'Notifications'}
              {activeSubpage === 'faq' && 'Help Center'}
              {activeSubpage === 'about' && 'About LBT'}
              {activeSubpage === 'pro' && 'LBT Pro'}
              {activeSubpage === 'privacy' && 'Privacy Settings'}
              {activeSubpage === 'appearance' && 'Appearance'}
              {activeSubpage === 'media' && 'Media & Data'}
            </h2>
          </div>
        </div>

        {/* PERSONAL */}
        {activeSubpage === 'personal' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              {/* Avatar row */}
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
                    <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setIsEmailVerified(false); }}
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
        )}

        {/* SECURITY */}
        {activeSubpage === 'security' && (
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
        )}

        {/* NOTIFICATIONS */}
        {activeSubpage === 'notifications' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden animate-fadeIn">
            {[
              { label: 'Likes', icon: <Heart className="w-4 h-4 text-error" />, state: notifLikes, toggle: () => { const next = !notifLikes; setNotifLikes(next); updateNotifPref('notif_likes', next); } },
              { label: 'Comments', icon: <MessageSquare className="w-4 h-4 text-primary" />, state: notifComments, toggle: () => { const next = !notifComments; setNotifComments(next); updateNotifPref('notif_comments', next); } },
              { label: 'Direct Messages', icon: <Mail className="w-4 h-4 text-on-surface" />, state: notifDMs, toggle: () => { const next = !notifDMs; setNotifDMs(next); updateNotifPref('notif_dms', next); } },
              { label: 'New Followers', icon: <Star className="w-4 h-4 text-on-surface-variant" />, state: notifFollowers, toggle: () => { const next = !notifFollowers; setNotifFollowers(next); updateNotifPref('notif_followers', next); } },
            ].map((item, i) => (
              <div key={i} onClick={item.toggle}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all ${i > 0 ? 'border-t border-outline-variant/10' : ''}`}>
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-xs font-bold text-on-surface">{item.label}</span>
                </div>
                <div className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${item.state ? 'bg-primary' : 'bg-outline-variant'}`}>
                  <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${item.state ? 'translate-x-[18px]' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        {activeSubpage === 'faq' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input type="text" value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search help articles..."
                  aria-label="Search help articles"
                  className="w-full bg-surface-container rounded-full pl-9 pr-4 py-2.5 text-xs outline-none border border-outline-variant/20" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'account', 'privacy', 'pro'] as const).map(cat => (
                  <button key={cat} onClick={() => setFaqCategory(cat)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full capitalize transition-all ${faqCategory === cat ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:text-on-surface'}`}>
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {FAQS.filter(f => (faqCategory === 'all' || f.cat === faqCategory) &&
                  (f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
                ).map(faq => (
                  <div key={faq.id} className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full p-3 flex justify-between items-center text-left hover:bg-surface-container/30 transition-colors">
                      <span className="text-xs font-bold text-on-surface pr-2">{faq.q}</span>
                      {expandedFaq === faq.id ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-outline shrink-0" />}
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-4 pb-3 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/10 pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
              <h3 className="text-xs font-bold text-on-surface">Contact Support</h3>
              {ticketStatus === 'success' ? (
                <div className="bg-surface-container-low text-on-surface border border-outline-variant p-3 rounded-xl text-xs font-bold text-center">
                  Ticket submitted! #{Math.floor(Math.random() * 89999 + 10000)}
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-2">
                  <input type="text" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Subject" required
                    aria-label="Support ticket subject"
                    className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20" />
                  <textarea value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Describe your issue..." required rows={3}
                    aria-label="Support ticket description"
                    className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20 resize-none" />
                  <button type="submit" disabled={ticketStatus === 'sending'}
                    className="bg-primary text-white font-bold text-xs py-2.5 rounded-xl disabled:opacity-50 w-full">
                    {ticketStatus === 'sending' ? 'Sending...' : 'Submit Ticket'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ABOUT */}
        {activeSubpage === 'about' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 text-center space-y-5 animate-fadeIn">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary flex items-center justify-center text-white text-2xl font-black">L</div>
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
        )}

        {/* PRO */}
        {activeSubpage === 'pro' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] border border-white/10 rounded-2xl p-5 space-y-4 text-white">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-extrabold uppercase bg-primary/20 text-on-surface tracking-widest px-3 py-1 rounded-full">Premium</span>
                <h3 className="text-lg font-bold">LBT Pro</h3>
                <p className="text-xs text-white/50">Unlock full analytics & HD uploads</p>
              </div>

              {proSuccess ? (
                <div className="bg-surface-container-low border border-outline-variant text-on-surface p-4 rounded-xl text-center text-xs font-bold">
                  Pro activated!
                </div>
              ) : (
                <>
                  <div className="flex bg-white/5 p-1 rounded-full text-xs justify-center">
                    <button onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-1.5 rounded-full font-bold transition-all ${billingCycle === 'monthly' ? 'bg-primary text-white' : 'text-white/60'}`}>
                      Monthly
                    </button>
                    <button onClick={() => setBillingCycle('yearly')}
                      className={`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${billingCycle === 'yearly' ? 'bg-primary text-white' : 'text-white/60'}`}>
                      Yearly <span className="text-[8px] bg-on-surface-variant text-black px-1 rounded">-30%</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => setSelectedPlan('free')}
                      className={`rounded-xl p-3 text-left border cursor-pointer transition-all ${selectedPlan === 'free' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/5 opacity-60'}`}>
                      <span className="text-[9px] uppercase text-white/50 font-mono">Free</span>
                      <h4 className="text-base font-extrabold mt-1">$0</h4>
                    </div>
                    <div onClick={() => setSelectedPlan('pro')}
                      className={`rounded-xl p-3 text-left border cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'pro' ? 'bg-primary/20 border-primary ring-1 ring-primary/40' : 'bg-white/5 border-white/5 opacity-60'}`}>
                      <div className="absolute top-1.5 right-1.5 bg-on-surface-variant text-black text-[7px] font-black px-1.5 py-0.5 rounded">PRO</div>
                      <span className="text-[9px] uppercase text-primary font-mono">Premium</span>
                      <h4 className="text-base font-extrabold mt-1">{billingCycle === 'monthly' ? '$9.99' : '$79.99'}<span className="text-xs text-white/50 font-normal">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span></h4>
                    </div>
                  </div>

                  {selectedPlan === 'pro' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => { setUpgradeGateway('apple'); setCcName('Jessica Thompson'); setCcNum('4532 9900'); }}
                          className={`flex-1 p-2 bg-black border border-white/15 rounded-xl text-[11px] font-bold ${upgradeGateway === 'apple' ? 'ring-2 ring-primary' : ''}`}>
                          Apple Pay
                        </button>
                        <button onClick={() => { setUpgradeGateway('google'); setCcName('Jessica Thompson'); setCcNum('8812 0032'); }}
                          className={`flex-1 p-2 bg-primary border border-white/15 rounded-xl text-[11px] font-bold ${upgradeGateway === 'google' ? 'ring-2 ring-primary' : ''}`}>
                          Google Pay
                        </button>
                        <button onClick={() => setUpgradeGateway('card')}
                          className={`flex-1 p-2 bg-zinc-800 border border-white/15 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 ${upgradeGateway === 'card' ? 'ring-2 ring-primary' : ''}`}>
                          <CreditCard className="w-3 h-3" /> Card
                        </button>
                      </div>

                      {upgradeGateway && (
                        <form onSubmit={handleCardUpgradeSubmit} className="bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
                          <input type="text" value={ccName} onChange={(e) => setCcName(e.target.value)} placeholder="Cardholder name" required
                            aria-label="Cardholder name"
                            className="w-full bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-semibold" />
                          <input type="text" value={ccNum} onChange={(e) => setCcNum(e.target.value)} placeholder="Card number" required
                            aria-label="Card number"
                            className="w-full bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={ccExp} onChange={(e) => setCcExp(e.target.value)} placeholder="MM/YY" required
                              aria-label="Expiration date"
                              className="bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                            <input type="text" value={ccCvc} onChange={(e) => setCcCvc(e.target.value)} placeholder="CVC" required
                              aria-label="CVC"
                              className="bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                          </div>
                          <button type="submit" className="bg-primary text-white font-extrabold text-[11px] py-2.5 rounded-xl w-full active:scale-95 transition-transform">
                            Pay {billingCycle === 'monthly' ? '$9.99' : '$79.99'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {/* PRIVACY */}
        {activeSubpage === 'privacy' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div onClick={() => { setPrivateAccount(!privateAccount); updateProfileField('is_private', !privateAccount); }}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Private Account</span>
                    <span className="text-[10px] text-outline">Only followers can see your posts</span>
                  </div>
                </div>
                <Toggle enabled={privateAccount} onToggle={() => { setPrivateAccount(!privateAccount); updateProfileField('is_private', !privateAccount); }} />
              </div>
              <div onClick={() => { setHideActivity(!hideActivity); updateProfileField('hide_activity', !hideActivity); }}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all border-t border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-4 h-4 text-on-surface-variant" />
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Hide Activity Status</span>
                    <span className="text-[10px] text-outline">Others won't see when you're online</span>
                  </div>
                </div>
                <Toggle enabled={hideActivity} onToggle={() => { setHideActivity(!hideActivity); updateProfileField('hide_activity', !hideActivity); }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10">
                <h3 className="text-xs font-bold text-on-surface">Who Can Mention You</h3>
              </div>
              {['everyone', 'followers', 'nobody'].map((opt) => (
                <div key={opt} onClick={() => { setAllowMentions(opt); updateProfileField('allow_mentions', opt); }}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all ${opt !== 'nobody' ? 'border-t border-outline-variant/10' : ''}`}>
                  <span className="text-xs font-bold text-on-surface capitalize">{opt}</span>
                  {allowMentions === opt && <Check className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <UserX className="w-4 h-4 text-error" />
                  <span className="text-xs font-bold text-on-surface">Blocked Accounts</span>
                </div>
                <span className="text-xs text-outline">{blockedCount}</span>
              </div>
              <div className="flex items-center justify-between p-4 border-t border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <UserMinus className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-xs font-bold text-on-surface">Muted Accounts</span>
                </div>
                <span className="text-xs text-outline">{mutedCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE */}
        {activeSubpage === 'appearance' && (
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
              <div onClick={() => setInlineSheet('textsize')}
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
              <div onClick={() => setInlineSheet('language')}
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
        )}

        {/* MEDIA */}
        {activeSubpage === 'media' && (
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
        )}
      </div>
    );
  }

  // --- Main Settings Page ---
  return (
    <div className="flex flex-col gap-5 animate-fadeIn py-3 max-w-xl mx-auto text-on-surface" id="settings_master">
      <div className="pb-1">
        <h2 className="text-lg font-bold tracking-tight text-on-surface">Settings</h2>
        <p className="text-xs text-outline">Manage your account preferences</p>
      </div>

      {/* Pro banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary p-5 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-on-surface fill-on-surface" /> LBT Pro
            </h2>
            <p className="text-[10px] text-white/80 mt-0.5">Unlock analytics & HD templates</p>
          </div>
          <button onClick={() => setActiveSubpage('pro')}
            className="bg-white text-primary font-extrabold text-[10px] py-2 px-4 rounded-full active:scale-95 transition-transform">
            Upgrade
          </button>
        </div>
      </section>

      {/* Group: Account */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Account</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => setActiveSubpage('personal')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Personal Information</span>
                <span className="text-[10px] text-outline">Name, bio, email, phone</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
          <div onClick={() => setActiveSubpage('security')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Security</span>
                <span className="text-[10px] text-outline">Password, 2FA, devices</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Group: Privacy */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Privacy</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => setActiveSubpage('privacy')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Privacy Settings</span>
                <span className="text-[10px] text-outline">Private account, mentions, blocks</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
          <div onClick={() => setInlineSheet('dms')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-on-surface" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Direct Messages</span>
                <span className="text-[10px] text-outline">{dmFromEveryone ? 'Everyone' : 'Followers only'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Group: Notifications */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Notifications</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => setActiveSubpage('notifications')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <Bell className="w-4 h-4 text-on-surface" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Notification Preferences</span>
                <span className="text-[10px] text-outline">Likes, comments, DMs, followers</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Group: Appearance */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Appearance</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => setActiveSubpage('appearance')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                {darkMode ? <Moon className="w-4 h-4 text-on-surface-variant" /> : <Sun className="w-4 h-4 text-on-surface-variant" />}
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Theme & Display</span>
                <span className="text-[10px] text-outline">Dark mode, text size, language</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Group: Media */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Media</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => setActiveSubpage('media')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Media & Data</span>
                <span className="text-[10px] text-outline">Auto-play, data saver, quality</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Group: Help */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Support</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          {onNavigateToInsights && (
            <div onClick={onNavigateToInsights}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-bold text-on-surface">Creator Insights</span>
              </div>
              <ChevronRight className="w-4 h-4 text-outline" />
            </div>
          )}
          <div onClick={() => setActiveSubpage('faq')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-500/10 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-xs font-bold text-on-surface">Help & FAQ</span>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
          <div onClick={() => setActiveSubpage('about')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-500/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-xs font-bold text-on-surface">About LBT</span>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="pt-1">
        <button onClick={onLogout}
          className="w-full bg-error/5 hover:bg-error/10 border border-error/20 text-error font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </section>

      {/* Inline Sheet: DMs */}
      {inlineSheet === 'dms' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setInlineSheet(null)}>
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-t-3xl p-5 pb-8 animate-slideIn" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-on-surface mb-4">Direct Messages</h3>
            <div className="space-y-3">
              <div onClick={() => setDmFromEveryone(!dmFromEveryone)} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-on-surface block">Allow Messages From</span>
                  <span className="text-[10px] text-outline">{dmFromEveryone ? 'Everyone' : 'Followers only'}</span>
                </div>
                <Toggle enabled={dmFromEveryone} onToggle={() => setDmFromEveryone(!dmFromEveryone)} />
              </div>
              <div onClick={() => setDmShowPreview(!dmShowPreview)} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-on-surface block">Show Message Preview</span>
                  <span className="text-[10px] text-outline">Preview text in notifications</span>
                </div>
                <Toggle enabled={dmShowPreview} onToggle={() => setDmShowPreview(!dmShowPreview)} />
              </div>
            </div>
            <button onClick={() => setInlineSheet(null)} className="w-full mt-4 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">Done</button>
          </div>
        </div>
      )}

      {/* Inline Sheet: Language */}
      {inlineSheet === 'language' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setInlineSheet(null)}>
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-t-3xl p-5 pb-8 animate-slideIn" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-on-surface mb-4">Language</h3>
            <div className="space-y-1">
              {[{ code: 'en', label: 'English' }, { code: 'fr', label: 'Francais' }, { code: 'ar', label: 'العربية' }, { code: 'es', label: 'Espanol' }].map((lang) => (
                <div key={lang.code} onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${language === lang.code ? 'bg-primary/10' : 'hover:bg-surface-container/30'}`}>
                  <span className="text-xs font-bold text-on-surface">{lang.label}</span>
                  {language === lang.code && <Check className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>
            <button onClick={() => setInlineSheet(null)} className="w-full mt-4 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">Done</button>
          </div>
        </div>
      )}

      {/* Inline Sheet: Text Size */}
      {inlineSheet === 'textsize' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setInlineSheet(null)}>
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-t-3xl p-5 pb-8 animate-slideIn" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-on-surface mb-4">Text Size</h3>
            <div className="space-y-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <div key={size} onClick={() => setTextSize(size)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${textSize === size ? 'bg-primary/10' : 'hover:bg-surface-container/30'}`}>
                  <span className={`font-bold text-on-surface ${size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'}`}>{size === 'small' ? 'Aa' : size === 'medium' ? 'Aa' : 'Aa'} {size.charAt(0).toUpperCase() + size.slice(1)}</span>
                  {textSize === size && <Check className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>
            <button onClick={() => setInlineSheet(null)} className="w-full mt-4 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
