import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Check, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { useStorage } from '../hooks/useStorage';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

interface EditProfileViewProps {
  user: User;
  onBack: () => void;
  onSaved: (updated: User) => void;
}

export default function EditProfileView({ user, onBack, onSaved }: EditProfileViewProps) {
  const [fullName, setFullName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [website, setWebsite] = useState(user.website || '');
  const [phoneLocal, setPhoneLocal] = useState(() => {
    const p = user.phone || '';
    if (p.startsWith('+213')) return p.slice(4);
    if (p.startsWith('0')) return p.slice(1);
    return p.replace(/\D/g, '').slice(-9);
  });
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [isPrivate, setIsPrivate] = useState(user.is_private ?? false);

  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [coverUrl, setCoverUrl] = useState(user.cover_url || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useStorage();

  // Phone validation: 9 digits starting with 5, 6, or 7
  const validatePhone = (local: string): boolean => {
    return /^[5-7]\d{8}$/.test(local);
  };

  const fullPhone = `+213${phoneLocal}`;
  const phoneValid = phoneLocal === '' || validatePhone(phoneLocal);

  // Username validation
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  const usernameValid = usernameRegex.test(username.toLowerCase());

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile('avatars', file);
      setAvatarUrl(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setFeedback({ type: 'error', text: 'Failed to upload avatar image.' });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile('avatars', file);
      setCoverUrl(url);
    } catch (err) {
      console.error('Cover upload failed:', err);
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const updateData: Database['public']['Tables']['profiles']['Update'] = {};
      updateData.display_name = fullName.trim();
      updateData.full_name = fullName.trim();
      updateData.username = username.toLowerCase().trim();
      updateData.bio = bio.trim();
      updateData.website = website.trim();
      updateData.is_private = isPrivate;
      updateData.avatar_url = avatarUrl;
      if (coverUrl) updateData.cover_url = coverUrl;
      if (phoneLocal && validatePhone(phoneLocal)) updateData.phone = fullPhone;
      if (dob) updateData.dob = dob;
      if (gender) updateData.gender = gender;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', authUser.id);

      if (error) throw error;

      onSaved({
        ...user,
        name: fullName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar: avatarUrl,
        cover_url: coverUrl,
        is_private: isPrivate,
        phone: phoneLocal && validatePhone(phoneLocal) ? fullPhone : user.phone,
      });

      setFeedback({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => onBack(), 1200);
    } catch (err: any) {
      console.error('Save failed:', err);
      setFeedback({ type: 'error', text: err?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col animate-fadeIn py-3 max-w-xl mx-auto text-on-surface min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30 mb-4">
        <button
          onClick={onBack}
          className="p-1 rounded-full hover:bg-surface-container select-none cursor-pointer transition-all text-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-md font-extrabold text-on-surface">Edit Profile</h2>
          <p className="text-[10px] text-outline font-semibold tracking-wider uppercase">Update your profile details</p>
        </div>
      </div>

      {/* Cover photo */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        <div
          className="h-32 sm:h-40 cursor-pointer relative group"
          onClick={() => coverInputRef.current?.click()}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a2744] via-[#2a3a5a] to-[#1a2744]" />
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-white/90 text-xs font-bold text-slate-800 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <Camera className="w-4 h-4" /> {coverUrl ? 'Change Cover' : 'Upload Cover'}
            </span>
          </div>
        </div>

        {/* Avatar overlay on cover */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full border-3 border-white bg-surface shadow-lg overflow-hidden cursor-pointer group"
          >
            <img src={avatarUrl || undefined} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="h-6" />

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold mb-4 ${
          feedback.type === 'success'
            ? 'bg-surface-container-low text-on-surface border border-outline-variant'
            : 'bg-error/10 text-error border border-error/25'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.text}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white border border-outline-variant/65 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary transition-colors font-medium"
            placeholder="Your full name"
          />
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Username</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className={`w-full bg-white border rounded-xl pl-8 pr-4 py-2.5 text-xs text-on-surface outline-none transition-colors font-medium ${
                !usernameValid && username ? 'border-error ring-1 ring-error/15' : 'border-outline-variant/65 focus:border-primary'
              }`}
              placeholder="username"
            />
          </div>
          {!usernameValid && username && (
            <p className="text-[10px] text-error font-bold">3-20 chars: letters, numbers, underscores only</p>
          )}
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white border border-outline-variant/65 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary transition-colors min-h-[80px] leading-relaxed font-medium"
            placeholder="Tell the world about yourself..."
            maxLength={150}
          />
          <p className="text-[9px] text-outline text-right">{bio.length}/150</p>
        </div>

        {/* Website */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full bg-white border border-outline-variant/65 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary transition-colors font-medium"
            placeholder="https://yoursite.com"
          />
        </div>

        {/* Phone — Algerian flag + +213 prefix */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Phone Number</label>
          <div className="flex gap-0">
            <div className="flex items-center bg-surface-container-low border border-r-0 border-outline-variant/65 rounded-l-xl px-3 py-2.5 gap-1.5 shrink-0 select-none">
              <span className="text-sm leading-none">🇩🇿</span>
              <span className="text-xs font-bold text-on-surface font-mono">+213</span>
            </div>
            <input
              type="tel"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className={`flex-1 bg-white border rounded-r-xl px-3.5 py-2.5 text-xs text-on-surface outline-none transition-colors font-mono font-semibold ${
                !phoneValid ? 'border-error ring-1 ring-error/15' : 'border-outline-variant/65 focus:border-primary'
              }`}
              placeholder="5XXXXXXXX"
              maxLength={9}
            />
          </div>
          {!phoneValid && (
            <p className="text-[10px] text-error font-bold">Must be 9 digits starting with 5, 6, or 7</p>
          )}
          {phoneLocal && phoneValid && (
            <p className="text-[10px] text-on-surface font-bold">✓ {fullPhone}</p>
          )}
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-white border border-outline-variant/65 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-medium"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-primary tracking-wider">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-white border border-outline-variant/65 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary font-mono font-medium"
          />
        </div>

        {/* Private Account Toggle */}
        <div className="flex items-center justify-between p-4 bg-white border border-outline-variant/40 rounded-xl select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">Private Account</span>
            <span className="text-[10px] text-outline">Only followers can see your posts</span>
          </div>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-11 h-6 rounded-full transition-all relative p-0.5 cursor-pointer ${
              isPrivate ? 'bg-primary' : 'bg-outline-variant'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${
              isPrivate ? 'translate-x-[20px]' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || isUploading || !fullName.trim() || !usernameValid || (phoneLocal !== '' && !phoneValid)}
        className="w-full mt-6 bg-gradient-to-r from-primary to-primary text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer active:scale-98 shadow-md hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </span>
        ) : isUploading ? (
          'Uploading image...'
        ) : (
          'Save Profile'
        )}
      </button>
    </div>
  );
}
