import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExploreView from '../components/ExploreView';

export default function ExplorePage() {
  const navigate = useNavigate();
  return (
    <ExploreView
      onSelectHashtag={(tag) => navigate('/hashtag/' + tag)}
      onPostSelect={(id) => navigate('/post/' + id)}
      onViewProfile={(userId) => navigate('/profile/' + userId)}
    />
  );
}
