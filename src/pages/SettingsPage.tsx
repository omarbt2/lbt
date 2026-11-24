import React from 'react';
import { Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { useAuthStore } from '../store/authStore';
import {
  User as UserIcon, Bell, Shield, HelpCircle, Info, LogOut, Star,
  Settings, BarChart3, ChevronRight, MessageCircle, Check, ImageIcon, Moon, Sun
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n/context';

import SettingsShell from '../components/settings/SettingsShell';
import PersonalSettings from '../components/settings/PersonalSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import PrivacySettings from '../components/settings/PrivacySettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import MediaSettings from '../components/settings/MediaSettings';
import ProSettings from '../components/settings/ProSettings';
import FaqSettings from '../components/settings/FaqSettings';
import AboutSettings from '../components/settings/AboutSettings';
import { Toggle } from '../components/settings/SettingsHelpers';
import BottomSheetMenu from '../components/ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from '../components/ui/BottomSheetMenu';

type Subpage = 'personal' | 'security' | 'notifications' | 'faq' | 'about' | 'pro' | 'privacy' | 'appearance' | 'media';

const SUBPAGE_TITLES: Record<Subpage, string> = {
  personal: 'Edit Profile',
  security: 'Security & Password',
  notifications: 'Notifications',
  faq: 'Help Center',
  about: 'About LBT',
  pro: 'LBT Pro',
  privacy: 'Privacy & Account',
  appearance: 'Appearance',
  media: 'Media & Data',
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, darkMode, toggleDarkMode, triggerToast } = useOutletContext<OutletContextType>();
  const { locale, setLocale, setTextSize: setAppTextSize } = useI18n();
  const onNavigateToInsights = () => navigate('/insights');
  const onLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      useAuthStore.getState().logout();
      triggerToast('Logged Out');
    }
  };

  const [activeSubpage, setActiveSubpage] = useState<Subpage | null>(() => {
    const section = searchParams.get('section');
    return section && Object.prototype.hasOwnProperty.call(SUBPAGE_TITLES, section) ? section as Subpage : null;
  });
  const openSubpage = (page: Subpage) => {
    setActiveSubpage(page);
    setSearchParams({ section: page });
  };
  const [inlineSheet, setInlineSheet] = useState<'dms' | 'language' | 'textsize' | null>(null);

  // --- Personal state ---
  const [editPic, setEditPic] = useState<string | null>(currentUser.avatar);
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editUsername, setEditUsername] = useState<string>(currentUser.username);
  const [editBio, setEditBio] = useState<string>(currentUser.bio || '');
  const [editEmail, setEditEmail] = useState<string>('');
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState('+1');
  const [phoneNum, setPhoneNum] = useState(currentUser.phone || '');
  const [dob, setDob] = useState(currentUser.date_of_birth || currentUser.dob || '');
  const [gender, setGender] = useState(currentUser.gender || '');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // --- Security state ---
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
    if (!currentUser?.id) return;
    let cancelled = false;
    const registerDevice = async () => {
      try {
        const userAgent = navigator.userAgent;
        const platform = /Android/i.test(userAgent) ? 'android'
          : /iPhone|iPad|iPod/i.test(userAgent) ? 'ios'
          : /Windows|Macintosh|Linux/i.test(userAgent) ? 'web' : 'unknown';
        const browser = /Edg\//.test(userAgent) ? 'Edge'
          : /Firefox\//.test(userAgent) ? 'Firefox'
          : /Chrome\//.test(userAgent) ? 'Chrome'
          : /Safari\//.test(userAgent) ? 'Safari' : 'Browser';
        const deviceName = /Android/i.test(userAgent) ? 'Android device'
          : /iPhone|iPad|iPod/i.test(userAgent) ? 'Apple mobile device'
          : /Windows/i.test(userAgent) ? 'Windows PC'
          : /Macintosh/i.test(userAgent) ? 'Mac'
          : /Linux/i.test(userAgent) ? 'Linux device' : 'Web device';
        let deviceKey = localStorage.getItem('lbt_device_key');
        if (!deviceKey) {
          const randomBytes = window.crypto.getRandomValues(new Uint8Array(24));
          deviceKey = Array.from(randomBytes, (value) => value.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('lbt_device_key', deviceKey);
        }
        const { error: upsertError } = await (supabase as any).from('user_devices').upsert({
          user_id: currentUser.id,
          device_key: deviceKey,
          device_name: deviceName,
          platform,
          browser,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id,device_key' });
        if (upsertError) throw upsertError;
        const { data, error } = await (supabase as any).from('user_devices')
          .select('id, device_key, device_name, platform, browser, last_seen_at')
          .eq('user_id', currentUser.id)
          .order('last_seen_at', { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        setActiveDevices((data || []).map((device: any) => ({
          id: device.id,
          device: `${device.device_name} · ${device.browser || 'Browser'}`,
          location: device.platform,
          time: device.device_key === deviceKey ? 'Active now' : new Date(device.last_seen_at).toLocaleString(),
          isCurrent: device.device_key === deviceKey,
        })));
      } catch (error) {
        console.error('Device registration failed:', error);
        if (!cancelled) setActiveDevices([]);
      }
    };
    void registerDevice();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // --- Notification state ---
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDMs, setNotifDMs] = useState(true);
  const [notifFollowers, setNotifFollowers] = useState(false);

  // --- Privacy state ---
  const [privateAccount, setPrivateAccount] = useState(false);
  const [hideActivity, setHideActivity] = useState(false);
  const [allowMentions, setAllowMentions] = useState('everyone');
  const [blockedCount, setBlockedCount] = useState(0);
  const [mutedCount, setMutedCount] = useState(0);

  // --- Appearance state ---
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>(() => (localStorage.getItem('lbt_text_size') as 'small' | 'medium' | 'large') || 'medium');
  const [language, setLanguage] = useState(locale);
  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('lbt_auto_play') !== 'false');

  // --- Media state ---
  const [dataSaver, setDataSaver] = useState(() => localStorage.getItem('lbt_data_saver') === 'true');
  const [highQualityUploads, setHighQualityUploads] = useState(() => localStorage.getItem('lbt_high_quality_uploads') !== 'false');

  // --- DM settings ---
  const [dmFromEveryone, setDmFromEveryone] = useState(true);
  const [dmShowPreview, setDmShowPreview] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const saveAccountSettings = async (patch: Record<string, any>) => {
    if (!currentUser?.id) return;
    const { error } = await (supabase as any).from('user_settings').upsert({
      user_id: currentUser.id,
      ...patch,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      console.error('Failed to save account settings:', error);
      triggerToast('Could not save this setting to your account', 'error');
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    const loadAccountSettings = async () => {
      try {
        const { data, error } = await (supabase as any).from('user_settings')
          .select('*').eq('user_id', currentUser.id).maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (data) {
          if (data.language) { setLanguage(data.language); setLocale(data.language); }
          if (data.text_size) { setTextSize(data.text_size); setAppTextSize(data.text_size); }
          if (typeof data.auto_play === 'boolean') setAutoPlay(data.auto_play);
          if (typeof data.data_saver === 'boolean') setDataSaver(data.data_saver);
          if (typeof data.high_quality_uploads === 'boolean') setHighQualityUploads(data.high_quality_uploads);
          if (typeof data.dm_show_preview === 'boolean') setDmShowPreview(data.dm_show_preview);
          if (data.allow_messages_from) setDmFromEveryone(data.allow_messages_from === 'everyone');
          if (data.theme) {
            const shouldBeDark = data.theme === 'dark';
            if (shouldBeDark !== darkMode) toggleDarkMode();
          }
        }
      } catch (error) {
        console.error('Failed to load account settings:', error);
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    };
    void loadAccountSettings();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!settingsLoaded || !currentUser?.id) return;
    void saveAccountSettings({
      language, text_size: textSize, theme: darkMode ? 'dark' : 'light',
      auto_play: autoPlay, data_saver: dataSaver,
      high_quality_uploads: highQualityUploads,
      dm_show_preview: dmShowPreview,
      allow_messages_from: dmFromEveryone ? 'everyone' : 'followers',
    });
  }, [settingsLoaded, currentUser?.id, language, textSize, darkMode, autoPlay, dataSaver, highQualityUploads, dmShowPreview, dmFromEveryone]);

  useEffect(() => {
    localStorage.setItem('lbt_auto_play', String(autoPlay));
    localStorage.setItem('lbt_data_saver', String(dataSaver));
    localStorage.setItem('lbt_high_quality_uploads', String(highQualityUploads));
  }, [autoPlay, dataSaver, highQualityUploads]);

  useEffect(() => {
    setLanguage(locale);
  }, [locale]);

  const handleLanguageChange = (next: string) => {
    const supported = ['en', 'fr', 'ar', 'es'] as const;
    if (!supported.includes(next as any)) return;
    const selectedLocale = next as typeof locale;
    setLanguage(selectedLocale);
    setLocale(selectedLocale);
    void saveAccountSettings({ language: selectedLocale });
  };

  const handleTextSizeChange = (next: 'small' | 'medium' | 'large') => {
    setTextSize(next);
    setAppTextSize(next);
    void saveAccountSettings({ text_size: next });
  };

  const updateNotifPref = async (field: string, value: boolean) => {
    const { error } = await (supabase.from('profiles') as any).update({ [field]: value }).eq('id', currentUser.id);
    if (error) console.error(`Failed to update notification preference "${field}":`, error.message);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    (supabase.from('profiles') as any)
      .select('notif_likes, notif_comments, notif_dms, notif_followers')
      .eq('id', currentUser.id)
      .single()
      .then(({ data, error }: any) => {
        if (error) {
          console.error('Failed to load notification preferences:', error.message);
          return;
        }
        if (data) {
          setNotifLikes(data.notif_likes ?? true);
          setNotifComments(data.notif_comments ?? true);
          setNotifDMs(data.notif_dms ?? true);
          setNotifFollowers(data.notif_followers ?? false);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load notification preferences:', err);
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (supabase.from('profiles') as any)
      .select('is_private, hide_activity, allow_mentions')
      .eq('id', currentUser.id)
      .single()
      .then(({ data, error }: any) => {
        if (data && !error) {
          setPrivateAccount(data.is_private ?? false);
          setHideActivity(data.hide_activity ?? false);
          setAllowMentions(data.allow_mentions ?? 'everyone');
        }
      })
      .catch(() => {});

    // Real counts from user_blocks / muted_users
    (supabase as any).from('user_blocks').select('id', { count: 'exact', head: true }).eq('blocker_id', currentUser.id)
      .then(({ count }: any) => setBlockedCount(count ?? 0));
    (supabase as any).from('muted_users').select('id', { count: 'exact', head: true }).eq('muter_id', currentUser.id)
      .then(({ count }: any) => setMutedCount(count ?? 0));
  }, [currentUser?.id]);

  const updateProfileField = async (field: string, value: any) => {
    const { error } = await (supabase.from('profiles') as any)
      .update({ [field]: value })
      .eq('id', currentUser.id);
    if (error) throw error;
    if (field === 'is_private') {
      useAuthStore.setState((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, is_private: Boolean(value) } : state.currentUser,
      }));
    }
  };

  // --- FAQ state ---
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<'all' | 'account' | 'privacy' | 'pro'>('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // --- Ticket state ---
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [ticketReference, setTicketReference] = useState<string | null>(null);
  const [ticketHistory, setTicketHistory] = useState<{ id: string; subject: string; status: string; created_at: string }[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  useEffect(() => {
    if (activeSubpage !== 'faq' || !currentUser?.id) return;
    let cancelled = false;
    setTicketsLoading(true);
    void supabase.from('support_tickets')
      .select('id, subject, status, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Could not load support requests:', error);
          triggerToast('Could not load your support requests', 'error');
          return;
        }
        setTicketHistory((data || []) as { id: string; subject: string; status: string; created_at: string }[]);
      })
      .finally(() => { if (!cancelled) setTicketsLoading(false); });
    return () => { cancelled = true; };
  }, [activeSubpage, currentUser?.id]);

  // --- Pro state ---
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');
  const [upgradeGateway, setUpgradeGateway] = useState<'apple' | 'google' | 'card' | null>(null);
  const [ccName, setCcName] = useState('');
  const [ccNum, setCcNum] = useState('');
  const [ccExp, setCcExp] = useState('');
  const [ccCvc, setCcCvc] = useState('');
  const [proSuccess, setProSuccess] = useState(false);

  const [isUsernameTaken, setIsUsernameTaken] = useState(false);

  useEffect(() => {
    if (!editUsername || editUsername === currentUser.username) {
      setIsUsernameTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', editUsername.toLowerCase())
        .neq('id', currentUser.id)
        .maybeSingle();
      setIsUsernameTaken(!!data);
    }, 500);
    return () => clearTimeout(timer);
  }, [editUsername, currentUser.username, currentUser.id]);

  const handleSavePersonalInfo = async () => {
    if (isUsernameTaken) { setSaveFeedback('Username is already taken!'); return; }
    if (!editName.trim() || !editUsername.trim()) { setSaveFeedback('Name and username required!'); return; }
    try {
      const { updateProfile } = await import('../lib/api/profiles');
      const updatedUser = await updateProfile({
        display_name: editName.trim(),
        username: editUsername.toLowerCase().trim(),
        avatar_url: editPic || undefined,
        bio: editBio.trim(),
        phone: phoneNum ? `${phonePrefix} ${phoneNum}` : null,
        dob: dob || null,
        gender: gender || null,
      });
      useAuthStore.setState({ currentUser: updatedUser });
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

  const handleDemoVerifyEmail = async () => {
    if (!editEmail.trim()) return;
    setIsEmailVerifying(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: editEmail.trim() });
      if (error) throw error;
      setIsEmailVerifying(false);
      setIsEmailVerified(false);
      setSaveFeedback('Confirmation email requested. Verify it from your inbox before the address changes.');
    } catch (err: any) {
      setSaveFeedback(err?.message || 'Failed to send verification email');
      setIsEmailVerifying(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    setTicketStatus('sending');
    try {
      const { data, error } = await supabase.from('support_tickets')
        .insert({ user_id: currentUser.id, subject: ticketSubject.trim(), description: ticketDesc.trim() })
        .select('id, subject, status, created_at')
        .single();
      if (error) throw error;
      setTicketReference(data.id);
      setTicketHistory(previous => [data, ...previous.filter(ticket => ticket.id !== data.id)].slice(0, 10));
      setTicketStatus('success');
      setTicketSubject('');
      setTicketDesc('');
      setTimeout(() => setTicketStatus('idle'), 4000);
    } catch (err) {
      setTicketStatus('idle');
      triggerToast('Failed to submit ticket', 'error');
    }
  };

  const handleCardUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProSuccess(false);
    triggerToast('LBT Pro payments are not connected yet. No charge was made.', 'error');
  };

  const toggleNotifLikes = () => { const next = !notifLikes; setNotifLikes(next); updateNotifPref('notif_likes', next); };
  const toggleNotifComments = () => { const next = !notifComments; setNotifComments(next); updateNotifPref('notif_comments', next); };
  const toggleNotifDMs = () => { const next = !notifDMs; setNotifDMs(next); updateNotifPref('notif_dms', next); };
  const toggleNotifFollowers = () => { const next = !notifFollowers; setNotifFollowers(next); updateNotifPref('notif_followers', next); };

  // There is only one profile editor. Legacy personal-info deep links now resolve to it.
  if (activeSubpage === 'personal') return <Navigate to="/edit-profile" replace />;

  // --- Subpage header ---
  if (activeSubpage) {
    return (
      <SettingsShell
        title={SUBPAGE_TITLES[activeSubpage]}
        onBack={() => { setActiveSubpage(null); setSearchParams({}); setSaveFeedback(null); setPassFeedback(null); }}
      >
        {activeSubpage === 'security' && (
          <SecuritySettings
            currentPass={currentPass} setCurrentPass={setCurrentPass}
            newPass={newPass} setNewPass={setNewPass}
            confirmPass={confirmPass} setConfirmPass={setConfirmPass}
            passFeedback={passFeedback}
            handleUpdatePassword={handleUpdatePassword}
            sms2FA={sms2FA} setSms2FA={setSms2FA}
            app2FA={app2FA} setApp2FA={setApp2FA}
            phonePrefix={phonePrefix} phoneNum={phoneNum}
            activeDevices={activeDevices}
            showDeletionConfirm={showDeletionConfirm}
            setShowDeletionConfirm={setShowDeletionConfirm}
            onLogout={onLogout}
          />
        )}

        {activeSubpage === 'notifications' && (
          <NotificationSettings
            notifLikes={notifLikes} notifComments={notifComments}
            notifDMs={notifDMs} notifFollowers={notifFollowers}
            toggleNotifLikes={toggleNotifLikes}
            toggleNotifComments={toggleNotifComments}
            toggleNotifDMs={toggleNotifDMs}
            toggleNotifFollowers={toggleNotifFollowers}
          />
        )}

        {activeSubpage === 'faq' && (
          <FaqSettings
            faqSearch={faqSearch} setFaqSearch={setFaqSearch}
            faqCategory={faqCategory} setFaqCategory={setFaqCategory}
            expandedFaq={expandedFaq} setExpandedFaq={setExpandedFaq}
            ticketSubject={ticketSubject} setTicketSubject={setTicketSubject}
            ticketDesc={ticketDesc} setTicketDesc={setTicketDesc}
            ticketStatus={ticketStatus}
            ticketReference={ticketReference}
            ticketHistory={ticketHistory}
            ticketsLoading={ticketsLoading}
            handleSubmitTicket={handleSubmitTicket}
          />
        )}

        {activeSubpage === 'about' && <AboutSettings />}

        {activeSubpage === 'pro' && (
          <ProSettings
            billingCycle={billingCycle} setBillingCycle={setBillingCycle}
            selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan}
            upgradeGateway={upgradeGateway} setUpgradeGateway={setUpgradeGateway}
            ccName={ccName} setCcName={setCcName}
            ccNum={ccNum} setCcNum={setCcNum}
            ccExp={ccExp} setCcExp={setCcExp}
            ccCvc={ccCvc} setCcCvc={setCcCvc}
            proSuccess={proSuccess}
            handleCardUpgradeSubmit={handleCardUpgradeSubmit}
          />
        )}

        {activeSubpage === 'privacy' && (
          <PrivacySettings
            privateAccount={privateAccount} setPrivateAccount={setPrivateAccount}
            hideActivity={hideActivity} setHideActivity={setHideActivity}
            allowMentions={allowMentions} setAllowMentions={setAllowMentions}
            blockedCount={blockedCount} mutedCount={mutedCount}
            updateProfileField={updateProfileField}
          />
        )}

        {activeSubpage === 'appearance' && (
          <AppearanceSettings
            darkMode={darkMode} toggleDarkMode={toggleDarkMode}
            textSize={textSize} language={language}
            openInlineSheet={setInlineSheet}
          />
        )}

        {activeSubpage === 'media' && (
          <MediaSettings
            autoPlay={autoPlay} setAutoPlay={setAutoPlay}
            dataSaver={dataSaver} setDataSaver={setDataSaver}
            highQualityUploads={highQualityUploads} setHighQualityUploads={setHighQualityUploads}
          />
        )}
      </SettingsShell>
    );
  }

  // --- Main Settings Page ---
  return (
    <div className="flex flex-col gap-5 animate-fadeIn py-3 pb-24 max-w-xl mx-auto text-on-surface" id="settings_master">
      <div className="pb-1">
        <h2 className="text-lg font-bold tracking-tight text-on-surface">Settings</h2>
        <p className="text-xs text-outline">Manage your account preferences</p>
      </div>

      <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <div className="flex items-start gap-3">
          <Star className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-on-surface">LBT Pro</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Premium subscriptions are not available yet. No payment details are collected and no upgrade can be purchased in this version.</p>
          </div>
        </div>
      </section>

      {/* Group: Account */}
      <section>
        <h4 className="text-[10px] font-extrabold text-primary mb-2 px-1 uppercase tracking-widest">Account</h4>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden divide-y divide-outline-variant/10">
          <div onClick={() => navigate('/edit-profile')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Edit Profile</span>
                <span className="text-[10px] text-outline">Name, username, bio, contact details, photos and status</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
          <div onClick={() => openSubpage('security')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface block">Security</span>
                <span className="text-[10px] text-outline">Password, registered devices, account safety</span>
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
          <div onClick={() => openSubpage('privacy')}
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
          <div onClick={() => openSubpage('notifications')}
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
          <div onClick={() => openSubpage('appearance')}
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
          <div onClick={() => openSubpage('media')}
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
          <div onClick={() => openSubpage('faq')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-500/10 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-on-surface-variant" />
              </div>
              <span className="text-xs font-bold text-on-surface">Help & FAQ</span>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </div>
          <div onClick={() => openSubpage('about')}
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
      <BottomSheetMenu
        isOpen={inlineSheet === 'dms'}
        onClose={() => setInlineSheet(null)}
        items={[
          {
            icon: <MessageCircle className="w-5 h-5" />,
            label: `Allow Messages From: ${dmFromEveryone ? 'Everyone' : 'Followers only'}`,
            onClick: () => setDmFromEveryone(!dmFromEveryone),
          },
          {
            icon: <Check className="w-5 h-5" />,
            label: `Show Preview: ${dmShowPreview ? 'On' : 'Off'}`,
            onClick: () => setDmShowPreview(!dmShowPreview),
          },
        ]}
        header={{ name: 'Direct Messages', subtitle: 'Manage who can message you' }}
      />

      {/* Inline Sheet: Language */}
      <BottomSheetMenu
        isOpen={inlineSheet === 'language'}
        onClose={() => setInlineSheet(null)}
        items={[
          { icon: language === 'en' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'English', onClick: () => handleLanguageChange('en') },
          { icon: language === 'fr' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'Francais', onClick: () => handleLanguageChange('fr') },
          { icon: language === 'ar' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'العربية', onClick: () => handleLanguageChange('ar') },
          { icon: language === 'es' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'Espanol', onClick: () => handleLanguageChange('es') },
        ]}
        header={{ name: 'Language' }}
      />

      {/* Inline Sheet: Text Size */}
      <BottomSheetMenu
        isOpen={inlineSheet === 'textsize'}
        onClose={() => setInlineSheet(null)}
        items={[
          { icon: textSize === 'small' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'Small', onClick: () => handleTextSizeChange('small') },
          { icon: textSize === 'medium' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'Medium', onClick: () => handleTextSizeChange('medium') },
          { icon: textSize === 'large' ? <Check className="w-5 h-5 text-primary" /> : <span className="w-5" />, label: 'Large', onClick: () => handleTextSizeChange('large') },
        ]}
        header={{ name: 'Text Size' }}
      />
    </div>
  );
}
