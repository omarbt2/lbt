import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    currentUser: store.currentUser,
    session: store.session,
    isLoading: store.isLoading,
    login: store.login,
    signup: store.signup,
    logout: store.logout,
    initialize: store.initialize,
    useUser: () => store.currentUser,
    useSession: () => store.session,
  };
}
export function useUser() {
  return useAuthStore((state) => state.currentUser);
}
export function useSession() {
  return useAuthStore((state) => state.session);
}
