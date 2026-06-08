import React from 'react';
import { useNavigate } from 'react-router-dom';
import BookmarksView from '../components/BookmarksView';

export default function BookmarksPage() {
  const navigate = useNavigate();
  return <BookmarksView onPostSelect={(id) => navigate('/post/' + id)} />;
}
