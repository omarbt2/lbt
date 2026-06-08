import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import MessagingView from '../components/MessagingView';

export default function MessagesPage() {
  const { currentUser } = useOutletContext<OutletContextType>();
  return (
    <MessagingView
      currentUser={currentUser}
    />
  );
}
