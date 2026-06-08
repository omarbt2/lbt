import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { useAuthStore } from '../store/authStore';
import SettingsView from '../components/SettingsView';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, darkMode, toggleDarkMode, triggerToast } = useOutletContext<OutletContextType>();

  return (
    <SettingsView
      darkMode={darkMode}
      onThemeToggle={toggleDarkMode}
      onLogout={() => {
        if (window.confirm('Are you sure you want to log out?')) {
          useAuthStore.getState().logout();
          triggerToast('Logged Out');
        }
      }}
      onNavigateToInsights={() => navigate('/insights')}
      currentUser={currentUser}
      onUpdateUser={async (updated) => {
        try {
          const { updateProfile } = await import('../lib/api/profiles');
          await updateProfile({
            name: updated.name,
            bio: updated.bio,
            avatar_url: updated.avatar || undefined,
          });
          await useAuthStore.getState().initialize();
          triggerToast('Profile updated successfully! ✅');
        } catch (err) {
          console.error('Profile update failed:', err);
          triggerToast('Failed to update profile', 'error');
        }
      }}
    />
  );
}
