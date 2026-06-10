import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';
import { getDefaultAvatar } from '../lib/defaultAvatars';

// Auth listener guard - ensure only ONE listener ever exists
let authListenerUnsubscribe: (() => void) | null = null;
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

export interface AuthState {
  currentUser: User | null;
  session: Session | null;
  isLoading: boolean;
  pendingVerification: boolean;
  pendingEmail: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export function mapProfileToUser(profile: any): User {
  return {
    id: profile.id ?? '',
    name: profile.display_name || profile.full_name || profile.name || profile.username || 'Unknown',
    username: profile.username ?? '',
    avatar: profile.avatar_url
      || getDefaultAvatar(profile.id || profile.username || 'user'),
    bio: profile.bio ?? '',
    cover_url: profile.cover_url || '',
    website: profile.website || '',
    phone: profile.phone || '',
    is_private: profile.is_private ?? false,
    is_verified: profile.is_verified ?? false,
    posts_count: profile.posts_count ?? 0,
    followersCount: profile.followers_count ?? 0,
    followingCount: profile.following_count ?? 0,
    isFollowing: profile.is_following ?? false,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  session: null,
  isLoading: true,
  pendingVerification: false,
  pendingEmail: null,

  initialize: async () => {
    if (isInitialized) return;
    isInitialized = true;

    set({ isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) {
          set({ session, currentUser: mapProfileToUser(profile as any) });
        } else {
          set({ session, currentUser: null });
        }
      } else {
        set({ session: null, currentUser: null });
      }
    } catch (err) {
      console.error('Session initialization error:', err);
      set({ session: null, currentUser: null });
    } finally {
      set({ isLoading: false });
    }

    // Guard: only ONE auth listener ever exists
    if (authListenerUnsubscribe) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) {
          set({ session, currentUser: mapProfileToUser(profile as any), pendingVerification: false });
        }
      } else {
        set({ session: null, currentUser: null });
      }
    });
    authListenerUnsubscribe = () => subscription.unsubscribe();

    // Token refresh check every 5 minutes
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          set({ currentUser: null, session: null });
        }
      } catch {
        set({ currentUser: null, session: null });
      }
    }, 5 * 60 * 1000);
  },

  login: async (emailOrUsername, password) => {
    set({ isLoading: true });
    try {
      const email = emailOrUsername.trim();
      if (!email.includes('@')) {
        throw new Error('Please sign in with your email address.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile) {
          set({ session: data.session, currentUser: mapProfileToUser(profile as any) });
        } else {
          // Profile not found — user exists in auth but not in profiles
          set({ session: data.session, currentUser: null });
        }
      }
    } catch (err) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password, username, name) => {
    set({ isLoading: true });
    try {
      if (username.length < 3 || !/^[a-z0-9_]+$/.test(username.toLowerCase())) {
        throw new Error('Username must be at least 3 characters and contain only letters, numbers, or underscores.');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, name } },
      });
      if (error) throw error;

      if (!data.user) throw new Error('Sign-up failed: user was not created.');

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        await supabase.auth.signOut();
        throw new Error('This username is already taken. Please choose another.');
      }

      if (!data.session) {
        set({ pendingVerification: true, pendingEmail: email, isLoading: false });
        const verifyError = new Error('VERIFY_EMAIL');
        (verifyError as any).code = 'VERIFY_EMAIL';
        throw verifyError;
      }

      const defaultAvatar = getDefaultAvatar(data.user.id);
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: name,
        avatar_url: defaultAvatar,
        bio: 'LBT member.',
        followers_count: 0,
        following_count: 0,
      }] as any);

      if (profileError) {
        if (profileError.code === '23505') {
          throw new Error('This username is already taken. Please choose another.');
        }
        await supabase.auth.signOut();
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        set({ session: data.session, currentUser: mapProfileToUser(profile as any), pendingVerification: false });
      }
    } catch (err) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      if (authListenerUnsubscribe) { authListenerUnsubscribe(); authListenerUnsubscribe = null; }
      if (refreshIntervalId) { clearInterval(refreshIntervalId); refreshIntervalId = null; }
      isInitialized = false;
      set({ session: null, currentUser: null, isLoading: false, pendingVerification: false, pendingEmail: null });
    }
  },
}));
