import React from 'react';
import { useNavigate } from 'react-router-dom';
import ReelsView from '../components/ReelsView';

export default function ReelsPage() {
  const navigate = useNavigate();
  return <ReelsView onBackToFeed={() => navigate('/')} />;
}
