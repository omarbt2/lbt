import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { getDefaultAvatar } from '../lib/defaultAvatars';

// Auth listener guard - ensure only ONE listener ever exists.
// BUG #7 FIX: module-level `let` state is re-initialized to its default values
// every time Vite HMR re-executes this module, while the *previous* module
// instance's closures (subscriptions, intervals) are still alive and running.
// This causes duplicate auth listeners / intervals to accumulate across HMR
// reloads in dev. We store this state on `import.meta.hot.data`, which Vite
// preserves across HMR re-executions of the same module, and dispose of the
// previous instance's listener/interval before the new module body runs.
interface AuthModuleState {
  authListenerUnsubscribe: (() => void) | null;
  refreshIntervalId: ReturnType<typeof setInterval> | null;
  isInitialized: boolean;
}

const hot = (import.meta as any).hot;
const moduleState: AuthModuleState = hot?.data?.authModuleState ?? {
  authListenerUnsubscribe: null,
  refreshIntervalId: null,
  isInitialized: false,
};

if (hot) {
  // Clean up the previous module instance's live resources before this
  // new instance takes over, then persist state for the next HMR cycle.
  hot.dispose((data: any) => {
    data.authModuleState = moduleState;
  });
}

let authListenerUnsubscribe: (() => void) | null = moduleState.authListenerUnsubscribe;
let refreshIntervalId: ReturnType<typeof setInterval> | null = moduleState.refreshIntervalId;
let isInitialized = moduleState.isInitialized;

// Keep moduleState in sync so hot.dispose() above captures current values.
function syncModuleState() {
  moduleState.authListenerUnsubscribe = authListenerUnsubscribe;
  moduleState.refreshIntervalId = refreshIntervalId;
  moduleState.isInitialized = isInitialized;
}

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
    dob: profile.dob || null,
    date_of_birth: profile.date_of_birth || profile.dob || null,
    gender: profile.gender || null,
    is_private: profile.is_private ?? false,
    is_verified: profile.is_verified ?? false,
    posts_count: profile.posts_count ?? 0,
    followersCount: profile.followers_count ?? 0,
    followingCount: profile.following_count ?? 0,
    isFollowing: profile.is_following ?? false,
  };
}

async function attachOwnPrivateProfileData(profile: any) {
  const { data, error } = await (supabase.rpc as any)('get_my_profile_private_data');
  if (error) throw error;
  const privateData = Array.isArray(data) ? data[0] : data;
  return { ...profile, ...(privateData || {}) };
}

async function ensureProfileForAuthUser(authUser: SupabaseAuthUser) {
  const { data: existing, error: lookupError } = await supabase
    .from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return await attachOwnPrivateProfileData(existing);

  const metadata = (authUser.user_metadata || {}) as Record<string, unknown>;
  const rawUsername = typeof metadata.username === 'string' ? metadata.username.toLowerCase().trim() : '';
  const fallbackUsername = `user_${authUser.id.replace(/-/g, '').slice(0, 10)}`;
  const preferredUsername = /^[a-z0-9_]{3,30}$/.test(rawUsername) ? rawUsername : fallbackUsername;
  const displayName = (typeof metadata.name === 'string' && metadata.name.trim())
    || (typeof metadata.full_name === 'string' && metadata.full_name.trim())
    || preferredUsername;

  // An account created while email confirmation is enabled has no session
  // at signup time, so the client cannot insert its profile until first login.
  // Try the supplied username first; if another account claimed it in the
  // meantime, use a stable unique fallback so the Auth account is not orphaned.
  for (const username of [preferredUsername, fallbackUsername]) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: authUser.id,
      username,
      display_name: displayName,
      avatar_url: getDefaultAvatar(authUser.id),
      bio: 'LBT member.',
    });
    if (!insertError) {
      const { data: created, error: createdError } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).single();
      if (createdError) throw createdError;
      return await attachOwnPrivateProfileData(created);
    }
    if (insertError.code !== '23505') throw insertError;

    const { data: racedProfile, error: racedError } = await supabase
      .from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (racedError) throw racedError;
    if (racedProfile) return await attachOwnPrivateProfileData(racedProfile);
  }

  throw new Error('Your account exists, but LBT could not create its profile. Please contact support.');
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
    syncModuleState();

    set({ isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await ensureProfileForAuthUser(session.user);
        set({ session, currentUser: mapProfileToUser(profile), pendingVerification: false, pendingEmail: null });
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        set({ session: null, currentUser: null });
        return;
      }

      // Do not await Supabase queries inside onAuthStateChange: the auth client
      // holds an internal lock while dispatching this event.
      setTimeout(() => {
        void ensureProfileForAuthUser(session.user).then(profile => {
          set({ session, currentUser: mapProfileToUser(profile), pendingVerification: false, pendingEmail: null });
        }).catch(error => {
          console.error('Could not initialize the signed-in LBT profile:', error);
          set({ session, currentUser: null });
        });
      }, 0);
    });
    authListenerUnsubscribe = () => subscription.unsubscribe();
    syncModuleState();

    // Token refresh check every 5 minutes.
    // BUG #2 FIX: only clear the session if Supabase explicitly reports no session.
    // Network/transient errors must NOT force a logout — just skip this cycle.
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Session refresh check failed (will retry):', error.message);
          return;
        }
        if (!session) {
          set({ currentUser: null, session: null });
        }
      } catch (err) {
        // Network error or similar — do not log the user out, just retry next cycle.
        console.warn('Session refresh check error (will retry):', err);
      }
    }, 5 * 60 * 1000);
    syncModuleState();
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
        const profile = await ensureProfileForAuthUser(data.user);
        set({ session: data.session, currentUser: mapProfileToUser(profile), pendingVerification: false, pendingEmail: null });
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

      // BUG #1 FIX: check username availability BEFORE creating the auth user,
      // so we never create an orphaned auth account for a duplicate username.
      // A final 23505 catch after the profile insert remains as a race-condition
      // backstop (DB has a unique index on lower(username)).
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('This username is already taken. Please choose another.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, name } },
      });
      if (error) throw error;

      if (!data.user) throw new Error('Sign-up failed: user was not created.');

      if (!data.session) {
        // Email confirmation is enabled: profile insertion must wait until
        // the user verifies the address and signs in for the first session.
        set({ pendingVerification: true, pendingEmail: email, isLoading: false });
        const verifyError = new Error('VERIFY_EMAIL');
        (verifyError as any).code = 'VERIFY_EMAIL';
        throw verifyError;
      }

      const profile = await ensureProfileForAuthUser(data.user);
      set({ session: data.session, currentUser: mapProfileToUser(profile), pendingVerification: false, pendingEmail: null });
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
      syncModuleState();
      set({ session: null, currentUser: null, isLoading: false, pendingVerification: false, pendingEmail: null });
    }
  },
}));
