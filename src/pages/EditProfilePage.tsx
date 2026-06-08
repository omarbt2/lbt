import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { useAuthStore } from '../store/authStore';
import EditProfileView from '../components/EditProfileView';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { currentUser, triggerToast } = useOutletContext<OutletContextType>();

  return (
    <EditProfileView
      user={currentUser}
      onBack={() => navigate(-1)}
      onSaved={async (updated) => {
        try {
          await useAuthStore.getState().initialize();
          triggerToast('Profile updated successfully!');
        } catch (err) {
          console.error(err);
        }
      }}
    />
  );
}
