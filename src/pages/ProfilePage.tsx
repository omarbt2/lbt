import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { User } from '../types';
import { getProfile } from '../lib/api/profiles';
import ProfileView from '../components/ProfileView';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, handleDeletePost } = useOutletContext<OutletContextType>();

  const [profileUser, setProfileUser] = useState<User | null>(null);

  useEffect(() => {
    if (!id || id === 'me') {
      setProfileUser(currentUser);
      return;
    }
    getProfile(id).then((u) => setProfileUser(u || currentUser));
  }, [id, currentUser]);

  if (!profileUser) return <LoadingSpinner />;

  return (
    <ProfileView
      user={profileUser}
      currentUser={currentUser}
      onStartMessage={() => navigate('/messages')}
      onPostSelect={(postId) => navigate('/post/' + postId)}
      onDeletePost={handleDeletePost}
      onEditProfile={() => navigate('/edit-profile')}
    />
  );
}
