import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReelsView from '../components/ReelsView';

export default function ReelsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialReelId = searchParams.get('id') || searchParams.get('reelId') || undefined;
  return <div key={location.key}><ReelsView onBackToFeed={() => navigate('/')} initialReelId={initialReelId} /></div>;
}
