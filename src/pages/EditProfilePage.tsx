import React, { useState, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Camera, Check, AlertCircle, User, AtSign, FileText, Link as LinkIcon, Phone, Shield, Smile } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { currentUser, triggerToast } = useOutletContext<OutletContextType>();
  const onBack = () => navigate(-1);

  const [fullName, setFullName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [phoneLocal, setPhoneLocal] = useState(() => {
    const p = currentUser.phone || '';
    if (p.startsWith('+213')) return p.slice(4);
    if (p.startsWith('0')) return p.slice(1);
    return p.replace(/\D/g, '').slice(-9);
  });
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState(() => (currentUser as any).date_of_birth || '');
  const [isPrivate, setIsPrivate] = useState(currentUser.is_private ?? false);

  const STATUS_EMOJIS = ['😊', '🔥', '💤', '🎵', '💼', '📸', '🎮', '📚', '✈️', '🍕', '💻', '🎨', '💪', '🌙', '☀️'];
  const [statusEmoji, setStatusEmoji] = useState((currentUser as any).status_emoji || '');
  const [statusText, setStatusText] = useState((currentUser as any).status_text || '');

  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [coverUrl, setCoverUrl] = useState(currentUser.cover_url || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useStorage();

  const validatePhone = (local: string): boolean => /^[5-7]\d{8}$/.test(local);
  const fullPhone = `+213${phoneLocal}`;
  const phoneValid = phoneLocal === '' || validatePhone(phoneLocal);
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  const usernameValid = usernameRegex.test(username.toLowerCase());

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile('avatars', file);
      setAvatarUrl(url);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to upload avatar image.' });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile('post-media', file, 'covers');
      setCoverUrl(url);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to upload cover image.' });
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setFeedback({ type: 'error', text: 'Full name is required.' });
      return;
    }
    if (!usernameValid) {
      setFeedback({ type: 'error', text: 'Username must be 3-20 chars: letters, numbers, underscores.' });
      return;
    }
    if (phoneLocal && !validatePhone(phoneLocal)) {
      setFeedback({ type: 'error', text: 'Phone: enter 9 digits starting with 5, 6, or 7.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const { updateProfile } = await import('../lib/api/profiles');
      await updateProfile({
        display_name: fullName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: avatarUrl || undefined,
        cover_url: coverUrl || undefined,
        phone: phoneLocal && validatePhone(phoneLocal) ? fullPhone : undefined,
        date_of_birth: dateOfBirth || null,
        gender: gender || undefined,
        is_private: isPrivate,
        status_emoji: statusEmoji || undefined,
        status_text: statusText || undefined,
        status_expires_at: statusEmoji ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      });

      await useAuthStore.getState().initialize();
      setFeedback({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => onBack(), 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-surface-container-low animate-fadeIn">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors active:scale-90">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <h1 className="text-base font-bold text-on-surface">Edit Profile</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-xl mx-auto">
          {/* Cover + Avatar — Snapchat-style centered */}
          <div className="relative">
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <div
              className="h-36 cursor-pointer relative group"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> {coverUrl ? 'Change' : 'Add Cover'}
                </span>
              </div>
            </div>

            {/* Avatar — centered, large */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="relative group"
              >
                <div className="w-24 h-24 rounded-full border-4 border-surface-container-low bg-surface-container overflow-hidden shadow-xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                      <User className="w-10 h-10 text-primary/50" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-3 border-surface-container-low shadow-md">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            </div>
          </div>

          <div className="h-16" />

          {/* Feedback */}
          {feedback && (
            <div className={`mx-4 mb-4 flex items-center gap-2 p-3 rounded-2xl text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {feedback.text}
            </div>
          )}

          {/* Form — Snapchat-style card sections */}
          <div className="px-4 space-y-3">
            {/* Basic Info Card */}
            <div className="bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Basic Info</span>
              </div>

              <div className="divide-y divide-outline-variant/10">
                {/* Full Name */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <User className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    placeholder="Your name"
                  />
                </div>

                {/* Username */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <AtSign className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className={`flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/50 ${
                      !usernameValid && username ? 'text-red-500' : 'text-on-surface'
                    }`}
                    placeholder="username"
                  />
                </div>

                {/* Bio */}
                <div className="flex items-start gap-3 px-4 py-3">
                  <FileText className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-transparent text-sm text-on-surface outline-none resize-none min-h-[60px] placeholder:text-on-surface-variant/50"
                      placeholder="Tell the world about yourself..."
                      maxLength={150}
                    />
                    <p className="text-[9px] text-on-surface-variant/60 text-right">{bio.length}/150</p>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <LinkIcon className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    placeholder="https://yoursite.com"
                  />
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Contact</span>
              </div>

              <div className="divide-y divide-outline-variant/10">
                {/* Phone */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Phone className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-sm">🇩🇿</span>
                    <span className="text-xs font-bold text-on-surface-variant">+213</span>
                    <input
                      type="tel"
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className={`flex-1 bg-transparent text-sm outline-none font-mono ml-1 ${
                        !phoneValid ? 'text-red-500' : 'text-on-surface'
                      }`}
                      placeholder="5XXXXXXXX"
                      maxLength={9}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <User className="w-4 h-4 text-on-surface-variant shrink-0" />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-on-surface outline-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs">🎂</span>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-on-surface outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Card */}
            <div className="bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Privacy</span>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-on-surface-variant" />
                  <div>
                    <span className="text-sm font-medium text-on-surface">Private Account</span>
                    <p className="text-[10px] text-on-surface-variant/70 mt-0.5">Only followers can see your posts</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-12 h-7 rounded-full transition-all relative p-0.5 cursor-pointer ${
                    isPrivate ? 'bg-primary' : 'bg-outline-variant/50'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-all ${
                    isPrivate ? 'translate-x-[20px]' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Status</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {STATUS_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setStatusEmoji(statusEmoji === emoji ? '' : emoji)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border transition-all active:scale-90 ${
                        statusEmoji === emoji
                          ? 'border-primary bg-primary/10 scale-110 shadow-md shadow-primary/10'
                          : 'border-outline-variant/20 hover:border-primary/40 bg-surface-container/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {statusEmoji && (
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value.slice(0, 30))}
                    placeholder="What's on your mind?"
                    className="w-full bg-surface-container/50 border border-outline-variant/20 rounded-2xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary/40 transition-colors text-center"
                    maxLength={30}
                  />
                )}
              </div>
            </div>

            {/* Validation errors */}
            {(!usernameValid && username) && (
              <p className="text-[10px] text-red-500 font-bold px-1">Username: 3-20 chars, letters, numbers, underscores</p>
            )}
            {(!phoneValid) && (
              <p className="text-[10px] text-red-500 font-bold px-1">Phone: 9 digits starting with 5, 6, or 7</p>
            )}
            {phoneLocal && phoneValid && (
              <p className="text-[10px] text-green-500 font-bold px-1">✓ {fullPhone}</p>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || isUploading || !fullName.trim() || !usernameValid || (phoneLocal !== '' && !phoneValid)}
              className="w-full bg-primary text-white font-bold text-sm py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : isUploading ? 'Uploading...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
