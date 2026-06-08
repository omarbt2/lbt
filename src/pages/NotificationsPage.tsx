import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import NotificationsView from '../components/NotificationsView';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { liveNotifications, handleMarkAllNotificationsAsRead } = useOutletContext<OutletContextType>();
  return (
    <NotificationsView
      notifications={liveNotifications}
      onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      onPostSelect={(id) => navigate('/post/' + id)}
    />
  );
}
